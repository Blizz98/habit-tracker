const { createApp, ref, computed, watch, nextTick, onMounted } = Vue

createApp({
  setup() {
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    /**
     * Returns today's date as a string in YYYY-MM-DD format
     * Uses local timezone to avoid UTC offset issues
     */
    const today = () => {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    // ============================================
    // REACTIVE STATE
    // ============================================
    
    // Core data
    const habits = ref([])
    
    // New habit form state
    const newHabit = ref('')
    const selectedIcon = ref('💪')
    const dailyGoal = ref(1)
    const customGoal = ref(4)
    const showCustom = ref(false)
    const selectedDays = ref([0, 1, 2, 3, 4, 5, 6])
    
    // Modal visibility states
    const showModal = ref(false)
    const showCalendar = ref(false)
    const showSettings = ref(false)
    
    // Delete confirmation
    const habitToDelete = ref(null)
    
    // Template refs
    const habitInput = ref(null)
    const carouselRef = ref(null)
    
    // Calendar navigation state
    const calendarMonth = ref(new Date())

    // Drag and drop state
    const draggedHabit = ref(null)
    const draggedIndex = ref(null)
    const touchStartY = ref(0)
    const touchCurrentIndex = ref(null)

    // Toast notification state
    const toast = ref({
      show: false,
      message: '',
      icon: '',
      type: 'success'
    })
    let toastTimeout = null

    // ============================================
    // CONSTANTS
    // ============================================
    
    const dayNames = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']
    
    const availableIcons = [
      '💪', '🏃', '📚', '🧘', '🎯', '💧',
      '🥗', '😴', '✍️', '🎨', '🎵', '🧠',
      '💻', '🎮', '📱', '☕', '🌟', '⭐',
      '🔥', '✨', '🌈', '💊', '🏋️', '🚴',
      '📝', '📖', '🎓', '🏆', '⚡', '🌺',
      '🧹', '🧺', '🍳', '🛒', '💰', '🎸'
    ]

    // ============================================
    // LOCAL STORAGE - LOAD
    // ============================================
    
    try {
      const stored = localStorage.getItem('habits')
      if (stored) {
        habits.value = JSON.parse(stored).map(h => ({
          ...h,
          dailyGoal: h.dailyGoal || 1,
          icon: h.icon || '⭐',
          activeDays: h.activeDays || [0, 1, 2, 3, 4, 5, 6]
        }))
      }
    } catch (e) {
      console.log('Could not load habits from localStorage')
    }

    // ============================================
    // LIFECYCLE HOOKS
    // ============================================
    
    onMounted(() => {
      nextTick(() => {
        if (carouselRef.value) {
          carouselRef.value.scrollLeft = carouselRef.value.scrollWidth
        }
      })
    })

    // ============================================
    // WATCHERS
    // ============================================
    
    watch(showModal, async (isOpen) => {
      if (isOpen) {
        await nextTick()
        habitInput.value?.focus()
        
        selectedIcon.value = '💪'
        dailyGoal.value = 1
        showCustom.value = false
        customGoal.value = 4
        selectedDays.value = [0, 1, 2, 3, 4, 5, 6]
      }
    })

    watch(habits, () => {
      try {
        localStorage.setItem('habits', JSON.stringify(habits.value))
      } catch (e) {
        console.log('Could not save habits to localStorage')
      }
    }, { deep: true })

    // ============================================
    // TOAST FUNCTIONS
    // ============================================

    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} icon - Emoji icon
     * @param {string} type - Toast type (success, streak, complete)
     * @param {number} duration - Duration in ms
     */
    function showToast(message, icon, type = 'success', duration = 2500) {
      // Clear any existing timeout
      if (toastTimeout) {
        clearTimeout(toastTimeout)
      }

      toast.value = {
        show: true,
        message,
        icon,
        type
      }

      toastTimeout = setTimeout(() => {
        toast.value.show = false
      }, duration)
    }

    /**
     * Generate appropriate toast message based on habit completion
     * @param {Object} habit - The habit that was toggled
     * @param {number} newCount - New completion count
     */
    function generateCompletionToast(habit, newCount) {
      const goal = habit.dailyGoal || 1
      const habitStreak = streak(habit)
      const todayDone = habits.value.filter(h => isHabitActiveToday(h) && isFullyDoneToday(h)).length
      const todayActiveTotal = habits.value.filter(h => isHabitActiveToday(h)).length

      // Just completed this habit fully
      if (newCount === goal) {
        // Check if all habits are now done
        if (todayDone === todayActiveTotal) {
          showToast('Všechny zvyky splněny! 🎉', '🏆', 'complete')
        }
        // Milestone streak
        else if (habitStreak > 0 && habitStreak % 7 === 0) {
          showToast(`${habitStreak} denní série! Pokračuj!`, '🔥', 'streak')
        }
        // New streak started (day 1)
        else if (habitStreak === 1) {
          showToast('Série zahájena!', '✨', 'success')
        }
        // Regular streak
        else if (habitStreak > 1) {
          showToast(`${habitStreak} denní série!`, '🔥', 'streak')
        }
        // Just completed
        else {
          showToast(`${habit.name} splněno!`, '✅', 'success')
        }
      }
      // Partial progress on multi-goal habit
      else if (newCount > 0 && goal > 1) {
        showToast(`${newCount}/${goal} hotovo`, '💪', 'success', 1500)
      }
    }

    // ============================================
    // COMPUTED PROPERTIES
    // ============================================
    
    const currentDate = computed(() => {
      return new Date().toLocaleDateString('cs-CZ', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      })
    })

    const calendarMonthLabel = computed(() => {
      return calendarMonth.value.toLocaleDateString('cs-CZ', {
        month: 'long',
        year: 'numeric'
      })
    })

    const calendarDays = computed(() => {
      const year = calendarMonth.value.getFullYear()
      const month = calendarMonth.value.getMonth()
      
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      
      const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
      const daysInMonth = lastDay.getDate()
      
      const days = []
      
      for (let i = 0; i < startingDayOfWeek; i++) {
        days.push({ empty: true, key: `empty-${i}` })
      }
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const isToday = dateStr === today()
        const date = new Date(year, month, day)
        const dayOfWeek = date.getDay()
        
        let completed = 0
        let total = 0
        
        habits.value.forEach(habit => {
          const activeDays = habit.activeDays || [0, 1, 2, 3, 4, 5, 6]
          
          if (activeDays.includes(dayOfWeek)) {
            total++
            const count = habit.days[dateStr] || 0
            if (count >= (habit.dailyGoal || 1)) {
              completed++
            }
          }
        })
        
        days.push({
          day,
          date: dateStr,
          isToday,
          completed,
          total,
          completionRate: total > 0 ? completed / total : 0,
          empty: false,
          otherMonth: false,
          key: dateStr
        })
      }
      
      return days
    })

    const carouselDays = computed(() => {
      const days = []
      const base = new Date()

      for (let i = -14; i <= 0; i++) {
        const d = new Date(base)
        d.setDate(d.getDate() + i)
        
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        const dayOfWeek = d.getDay()

        let completed = 0
        let total = 0
        
        habits.value.forEach(h => {
          const activeDays = h.activeDays || [0, 1, 2, 3, 4, 5, 6]
          
          if (activeDays.includes(dayOfWeek)) {
            total++
            const count = h.days[key] || 0
            if (count >= (h.dailyGoal || 1)) {
              completed++
            }
          }
        })

        days.push({
          date: key,
          day: d.getDate(),
          weekday: d.toLocaleDateString('cs-CZ', { weekday: 'short' }),
          isToday: key === today(),
          completionRate: total > 0 ? completed / total : 0,
          hasHabits: total > 0
        })
      }
      
      return days
    })

    const todayCompleted = computed(() => {
      return habits.value.filter(h => isHabitActiveToday(h) && isFullyDoneToday(h)).length
    })

    const todayTotal = computed(() => {
      return habits.value.filter(h => isHabitActiveToday(h)).length
    })

    const totalHabits = computed(() => habits.value.length)

    const bestStreak = computed(() => {
      if (habits.value.length === 0) return 0
      return Math.max(...habits.value.map(h => streak(h)))
    })

    const totalCompletions = computed(() => {
      let total = 0
      
      habits.value.forEach(habit => {
        Object.entries(habit.days || {}).forEach(([dateStr, count]) => {
          if (isHabitActiveForDate(habit, dateStr) && count >= (habit.dailyGoal || 1)) {
            total++
          }
        })
      })
      
      return total
    })

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    
    function isHabitActiveForDate(habit, dateStr) {
      const date = new Date(dateStr)
      const activeDays = habit.activeDays || [0, 1, 2, 3, 4, 5, 6]
      return activeDays.includes(date.getDay())
    }

    function isHabitActiveToday(habit) {
      const activeDays = habit.activeDays || [0, 1, 2, 3, 4, 5, 6]
      return activeDays.includes(new Date().getDay())
    }

    function getCompletionCount(habit) {
      return habit.days[today()] || 0
    }

    function isFullyDoneToday(habit) {
      if (!isHabitActiveToday(habit)) return false
      return getCompletionCount(habit) >= (habit.dailyGoal || 1)
    }

    function getProgressPercent(habit) {
      return (getCompletionCount(habit) / (habit.dailyGoal || 1)) * 100
    }

    function streak(habit) {
      let count = 0
      let d = new Date()

      while (count < 365) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        
        if (!isHabitActiveForDate(habit, key)) {
          d.setDate(d.getDate() - 1)
          continue
        }
        
        const completions = habit.days[key] || 0
        if (completions < (habit.dailyGoal || 1)) {
          break
        }
        
        count++
        d.setDate(d.getDate() - 1)
      }
      
      return count
    }

    function getActiveDaysText(habit) {
      const activeDays = habit.activeDays || [0, 1, 2, 3, 4, 5, 6]
      
      if (activeDays.length === 7) return 'Každý den'
      if (activeDays.length === 0) return 'Žádný den'
      
      return [...activeDays]
        .sort((a, b) => a - b)
        .map(d => dayNames[d])
        .join(', ')
    }

    // ============================================
    // DRAG AND DROP FUNCTIONS
    // ============================================

    /**
     * Handle drag start event
     * @param {DragEvent} event 
     * @param {number} index - Index of the habit being dragged
     */
    function onDragStart(event, index) {
      draggedHabit.value = habits.value[index]
      draggedIndex.value = index
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', index)
    }

    /**
     * Handle drag over event
     * @param {DragEvent} event 
     * @param {number} index - Index of the habit being dragged over
     */
    function onDragOver(event, index) {
      if (draggedIndex.value === null || draggedIndex.value === index) return
      
      // Reorder the habits array
      const draggedItem = habits.value[draggedIndex.value]
      habits.value.splice(draggedIndex.value, 1)
      habits.value.splice(index, 0, draggedItem)
      draggedIndex.value = index
    }

    /**
     * Handle drag end event
     */
    function onDragEnd() {
      draggedHabit.value = null
      draggedIndex.value = null
    }

    /**
     * Handle touch start for mobile drag
     * @param {TouchEvent} event 
     * @param {number} index 
     */
    function onTouchStart(event, index) {
      touchStartY.value = event.touches[0].clientY
      touchCurrentIndex.value = index
      draggedHabit.value = habits.value[index]
      draggedIndex.value = index
    }

    /**
     * Handle touch move for mobile drag
     * @param {TouchEvent} event 
     */
    function onTouchMove(event) {
      if (draggedIndex.value === null) return

      const touchY = event.touches[0].clientY
      const habitElements = document.querySelectorAll('.habit')
      
      habitElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect()
        const centerY = rect.top + rect.height / 2

        if (touchY > rect.top && touchY < rect.bottom && index !== draggedIndex.value) {
          // Reorder
          const draggedItem = habits.value[draggedIndex.value]
          habits.value.splice(draggedIndex.value, 1)
          habits.value.splice(index, 0, draggedItem)
          draggedIndex.value = index
        }
      })
    }

    /**
     * Handle touch end for mobile drag
     */
    function onTouchEnd() {
      draggedHabit.value = null
      draggedIndex.value = null
      touchCurrentIndex.value = null
    }

    // ============================================
    // ACTION FUNCTIONS
    // ============================================
    
    function previousMonth() {
      const newDate = new Date(calendarMonth.value)
      newDate.setMonth(newDate.getMonth() - 1)
      calendarMonth.value = newDate
    }

    function nextMonth() {
      const newDate = new Date(calendarMonth.value)
      newDate.setMonth(newDate.getMonth() + 1)
      calendarMonth.value = newDate
    }

    function toggleDay(day) {
      const index = selectedDays.value.indexOf(day)
      
      if (index > -1) {
        if (selectedDays.value.length > 1) {
          selectedDays.value.splice(index, 1)
        }
      } else {
        selectedDays.value.push(day)
      }
    }

    function addHabit() {
      if (!newHabit.value.trim()) return
      
      habits.value.push({
        id: Date.now(),
        name: newHabit.value,
        icon: selectedIcon.value,
        dailyGoal: dailyGoal.value,
        days: {},
        activeDays: [...selectedDays.value]
      })
      
      showToast(`${newHabit.value} přidáno!`, '✨', 'success')
      
      newHabit.value = ''
      showModal.value = false
    }

    function closeModal() {
      showModal.value = false
      newHabit.value = ''
    }

    function removeHabit(habit) {
      habitToDelete.value = habit
    }

    function confirmDelete() {
      if (habitToDelete.value) {
        const name = habitToDelete.value.name
        habits.value = habits.value.filter(h => h.id !== habitToDelete.value.id)
        habitToDelete.value = null
        showToast(`${name} smazáno`, '🗑️', 'success')
      }
    }

    function toggleToday(habit) {
      if (!isHabitActiveToday(habit)) return
      
      const d = today()
      const currentCount = habit.days[d] || 0
      const goal = habit.dailyGoal || 1
      
      // Calculate new count
      const newCount = currentCount >= goal ? 0 : currentCount + 1
      habit.days[d] = newCount

      // Show toast only when making progress (not when resetting)
      if (newCount > 0) {
        // Use nextTick to ensure streak calculation is accurate
        nextTick(() => {
          generateCompletionToast(habit, newCount)
        })
      }
    }

    // ============================================
    // RETURN PUBLIC API
    // ============================================
    
    return {
      // State
      habits,
      newHabit,
      selectedIcon,
      dailyGoal,
      customGoal,
      showCustom,
      showModal,
      showCalendar,
      showSettings,
      habitToDelete,
      habitInput,
      calendarMonth,
      carouselRef,
      selectedDays,
      draggedHabit,
      toast,
      
      // Constants
      dayNames,
      availableIcons,
      
      // Computed
      currentDate,
      calendarMonthLabel,
      calendarDays,
      carouselDays,
      todayCompleted,
      todayTotal,
      totalHabits,
      bestStreak,
      totalCompletions,
      
      // Methods
      previousMonth,
      nextMonth,
      toggleDay,
      getActiveDaysText,
      addHabit,
      closeModal,
      removeHabit,
      confirmDelete,
      toggleToday,
      getCompletionCount,
      isFullyDoneToday,
      isHabitActiveToday,
      getProgressPercent,
      streak,
      
      // Drag and drop
      onDragStart,
      onDragOver,
      onDragEnd,
      onTouchStart,
      onTouchMove,
      onTouchEnd
    }
  }
}).mount('#app')