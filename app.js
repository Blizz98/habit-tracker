const { createApp, ref, computed, watch, nextTick, onMounted } = Vue

createApp({
  setup() {
    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    
    const today = () => {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    const getDateString = (date) => {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    }

    // ============================================
    // REACTIVE STATE
    // ============================================
    
    const habits = ref([])
    const categories = ref([])
    
    // New habit form state
    const newHabit = ref('')
    const selectedIcon = ref('💪')
    const dailyGoal = ref(1)
    const customGoal = ref(4)
    const showCustom = ref(false)
    const selectedDays = ref([0, 1, 2, 3, 4, 5, 6])
    const selectedCategoryId = ref(null)
    
    // New category form state
    const newCategoryName = ref('')
    const selectedColor = ref('#667eea')
    
    // Filter state
    const selectedCategory = ref(null)
    
    // Modal visibility states
    const showModal = ref(false)
    const showCalendar = ref(false)
    const showSettings = ref(false)
    const showCategoryModal = ref(false)
    
    // Delete confirmation
    const habitToDelete = ref(null)
    
    // Edit habit state
    const habitToEdit = ref(null)
    const editShowCustom = ref(false)
    const editForm = ref({
      name: '',
      icon: '💪',
      dailyGoal: 1,
      activeDays: [0, 1, 2, 3, 4, 5, 6],
      categoryId: null
    })
    
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

    // Celebration animation state
    const celebratingHabitId = ref(null)
    let celebrationTimeout = null

    // ============================================
    // CONSTANTS
    // ============================================
    
    const dayNames = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So']
    const dayNamesFull = ['Neděle', 'Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota']
    
    const availableIcons = [
      '💪', '🏃', '📚', '🧘', '🎯', '💧',
      '🥗', '😴', '✍️', '🎨', '🎵', '🧠',
      '💻', '🎮', '📱', '☕', '🌟', '⭐',
      '🔥', '✨', '🌈', '💊', '🏋️', '🚴',
      '📝', '📖', '🎓', '🏆', '⚡', '🌺',
      '🧹', '🧺', '🍳', '🛒', '💰', '🎸'
    ]

    const availableColors = [
      '#667eea', '#764ba2', '#f59e0b', '#10b981', 
      '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4',
      '#84cc16', '#f97316', '#6366f1', '#14b8a6'
    ]

    // ============================================
    // LOCAL STORAGE - LOAD
    // ============================================
    
    try {
      const storedHabits = localStorage.getItem('habits')
      if (storedHabits) {
        habits.value = JSON.parse(storedHabits).map(h => ({
          ...h,
          dailyGoal: h.dailyGoal || 1,
          icon: h.icon || '⭐',
          activeDays: h.activeDays || [0, 1, 2, 3, 4, 5, 6],
          categoryId: h.categoryId || null,
          createdAt: h.createdAt || today() // Default to today for existing habits
        }))
      }
      
      const storedCategories = localStorage.getItem('categories')
      if (storedCategories) {
        categories.value = JSON.parse(storedCategories)
      }
    } catch (e) {
      console.log('Could not load data from localStorage')
    }

    // ============================================
    // HELPER - GET TRACKING START DATE
    // ============================================
    
    // Returns the earliest date we should consider for analytics
    // (the date when user created their first habit)
    function getTrackingStartDate() {
      if (habits.value.length === 0) return today()
      
      let earliest = today()
      habits.value.forEach(h => {
        if (h.createdAt && h.createdAt < earliest) {
          earliest = h.createdAt
        }
      })
      return earliest
    }

    // Returns number of days since tracking started
    function getDaysSinceStart() {
      const startDate = new Date(getTrackingStartDate())
      const now = new Date(today())
      const diffTime = now - startDate
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      return diffDays + 1 // Include start day
    }

    // Computed properties for dynamic labels
    const trackingDaysForAverage = computed(() => {
      return Math.min(30, getDaysSinceStart())
    })

    const trackingDaysForTrend = computed(() => {
      return Math.min(7, getDaysSinceStart())
    })

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
        selectedCategoryId.value = null
      }
    })

    watch(showCategoryModal, (isOpen) => {
      if (isOpen) {
        newCategoryName.value = ''
        selectedColor.value = availableColors[0]
      }
    })

    watch(habits, () => {
      try {
        localStorage.setItem('habits', JSON.stringify(habits.value))
      } catch (e) {
        console.log('Could not save habits to localStorage')
      }
    }, { deep: true })

    watch(categories, () => {
      try {
        localStorage.setItem('categories', JSON.stringify(categories.value))
      } catch (e) {
        console.log('Could not save categories to localStorage')
      }
    }, { deep: true })

    // ============================================
    // TOAST FUNCTIONS
    // ============================================

    function showToast(message, icon, type = 'success', duration = 2500) {
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

    function generateCompletionToast(habit, newCount) {
      const goal = habit.dailyGoal || 1
      const habitStreak = streak(habit)
      const todayDone = habits.value.filter(h => isHabitActiveToday(h) && isFullyDoneToday(h)).length
      const todayActiveTotal = habits.value.filter(h => isHabitActiveToday(h)).length

      if (newCount === goal) {
        if (todayDone === todayActiveTotal) {
          showToast('Všechny zvyky splněny! 🎉', '🏆', 'complete')
        } else if (habitStreak > 0 && habitStreak % 7 === 0) {
          showToast(`${habitStreak} denní série! Pokračuj!`, '🔥', 'streak')
        } else if (habitStreak === 1) {
          showToast('Série zahájena!', '✨', 'success')
        } else if (habitStreak > 1) {
          showToast(`${habitStreak} denní série!`, '🔥', 'streak')
        } else {
          showToast(`${habit.name} splněno!`, '✅', 'success')
        }
      } else if (newCount > 0 && goal > 1) {
        showToast(`${newCount}/${goal} hotovo`, '💪', 'success', 1500)
      }
    }

    // ============================================
    // COMPUTED PROPERTIES - BASIC
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

    const filteredHabits = computed(() => {
      if (selectedCategory.value === null) {
        return habits.value
      }
      return habits.value.filter(h => h.categoryId === selectedCategory.value)
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
    // COMPUTED PROPERTIES - CALENDAR
    // ============================================

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
        
        const key = getDateString(d)
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

    // ============================================
    // COMPUTED PROPERTIES - ANALYTICS
    // ============================================

    const weeklyAnalytics = computed(() => {
      const result = []
      const base = new Date()
      const startDateStr = getTrackingStartDate()
      
      for (let i = -6; i <= 0; i++) {
        const d = new Date(base)
        d.setDate(d.getDate() + i)
        const dateStr = getDateString(d)
        const dayOfWeek = d.getDay()
        
        // If this day is before tracking started, show 0
        if (dateStr < startDateStr) {
          result.push({
            day: dayNames[dayOfWeek],
            percentage: 0,
            isToday: i === 0,
            noData: true
          })
          continue
        }
        
        let completed = 0
        let total = 0
        
        habits.value.forEach(h => {
          // Only count habits that existed on this date
          if (h.createdAt && h.createdAt > dateStr) return
          
          const activeDays = h.activeDays || [0, 1, 2, 3, 4, 5, 6]
          if (activeDays.includes(dayOfWeek)) {
            total++
            const count = h.days[dateStr] || 0
            if (count >= (h.dailyGoal || 1)) {
              completed++
            }
          }
        })
        
        result.push({
          day: dayNames[dayOfWeek],
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
          isToday: i === 0
        })
      }
      
      return result
    })

    const completionTrend = computed(() => {
      if (habits.value.length === 0) return 0
      
      const daysSinceStart = getDaysSinceStart()
      const startDateStr = getTrackingStartDate()
      
      // Need at least 2 days to calculate trend
      if (daysSinceStart < 2) return 0
      
      const getWeekAverage = (weeksAgo) => {
        let totalPercentage = 0
        let days = 0
        const base = new Date()
        
        for (let i = 0; i < 7; i++) {
          const d = new Date(base)
          d.setDate(d.getDate() - (weeksAgo * 7) - i)
          const dateStr = getDateString(d)
          
          // Skip days before tracking started
          if (dateStr < startDateStr) continue
          
          const dayOfWeek = d.getDay()
          
          let completed = 0
          let total = 0
          
          habits.value.forEach(h => {
            // Only count habits that existed on this date
            if (h.createdAt && h.createdAt > dateStr) return
            
            const activeDays = h.activeDays || [0, 1, 2, 3, 4, 5, 6]
            if (activeDays.includes(dayOfWeek)) {
              total++
              const count = h.days[dateStr] || 0
              if (count >= (h.dailyGoal || 1)) {
                completed++
              }
            }
          })
          
          if (total > 0) {
            totalPercentage += (completed / total) * 100
            days++
          }
        }
        
        return days > 0 ? totalPercentage / days : 0
      }
      
      const thisWeek = getWeekAverage(0)
      const lastWeek = getWeekAverage(1)
      
      // If no data for last week, show 0 instead of misleading trend
      if (lastWeek === 0 && thisWeek > 0) return 0
      
      return Math.round(thisWeek - lastWeek)
    })

    const bestDayOfWeek = computed(() => {
      if (habits.value.length === 0) return '-'
      
      const daysSinceStart = getDaysSinceStart()
      const startDateStr = getTrackingStartDate()
      const daysToCheck = Math.min(30, daysSinceStart)
      
      const dayStats = [0, 0, 0, 0, 0, 0, 0]
      const dayCounts = [0, 0, 0, 0, 0, 0, 0]
      
      const base = new Date()
      for (let i = 0; i < daysToCheck; i++) {
        const d = new Date(base)
        d.setDate(d.getDate() - i)
        const dateStr = getDateString(d)
        
        // Skip days before tracking started
        if (dateStr < startDateStr) continue
        
        const dayOfWeek = d.getDay()
        
        let completed = 0
        let total = 0
        
        habits.value.forEach(h => {
          // Only count habits that existed on this date
          if (h.createdAt && h.createdAt > dateStr) return
          
          const activeDays = h.activeDays || [0, 1, 2, 3, 4, 5, 6]
          if (activeDays.includes(dayOfWeek)) {
            total++
            const count = h.days[dateStr] || 0
            if (count >= (h.dailyGoal || 1)) {
              completed++
            }
          }
        })
        
        if (total > 0) {
          dayStats[dayOfWeek] += (completed / total) * 100
          dayCounts[dayOfWeek]++
        }
      }
      
      let bestDay = 0
      let bestAverage = 0
      
      for (let i = 0; i < 7; i++) {
        const avg = dayCounts[i] > 0 ? dayStats[i] / dayCounts[i] : 0
        if (avg > bestAverage) {
          bestAverage = avg
          bestDay = i
        }
      }
      
      // If no data yet, show dash
      if (bestAverage === 0) return '-'
      
      return dayNamesFull[bestDay]
    })

    const averageCompletionRate = computed(() => {
      if (habits.value.length === 0) return 0
      
      const daysSinceStart = getDaysSinceStart()
      const startDateStr = getTrackingStartDate()
      const daysToCheck = Math.min(30, daysSinceStart)
      
      let totalPercentage = 0
      let days = 0
      const base = new Date()
      
      for (let i = 0; i < daysToCheck; i++) {
        const d = new Date(base)
        d.setDate(d.getDate() - i)
        const dateStr = getDateString(d)
        
        // Skip days before tracking started
        if (dateStr < startDateStr) continue
        
        const dayOfWeek = d.getDay()
        
        let completed = 0
        let total = 0
        
        habits.value.forEach(h => {
          // Only count habits that existed on this date
          if (h.createdAt && h.createdAt > dateStr) return
          
          const activeDays = h.activeDays || [0, 1, 2, 3, 4, 5, 6]
          if (activeDays.includes(dayOfWeek)) {
            total++
            const count = h.days[dateStr] || 0
            if (count >= (h.dailyGoal || 1)) {
              completed++
            }
          }
        })
        
        if (total > 0) {
          totalPercentage += (completed / total) * 100
          days++
        }
      }
      
      return days > 0 ? Math.round(totalPercentage / days) : 0
    })

    const perfectDays = computed(() => {
      if (habits.value.length === 0) return 0
      
      const daysSinceStart = getDaysSinceStart()
      const startDateStr = getTrackingStartDate()
      const daysToCheck = Math.min(30, daysSinceStart)
      
      let count = 0
      const base = new Date()
      
      for (let i = 0; i < daysToCheck; i++) {
        const d = new Date(base)
        d.setDate(d.getDate() - i)
        const dateStr = getDateString(d)
        
        // Skip days before tracking started
        if (dateStr < startDateStr) continue
        
        const dayOfWeek = d.getDay()
        
        let completed = 0
        let total = 0
        
        habits.value.forEach(h => {
          // Only count habits that existed on this date
          if (h.createdAt && h.createdAt > dateStr) return
          
          const activeDays = h.activeDays || [0, 1, 2, 3, 4, 5, 6]
          if (activeDays.includes(dayOfWeek)) {
            total++
            const cnt = h.days[dateStr] || 0
            if (cnt >= (h.dailyGoal || 1)) {
              completed++
            }
          }
        })
        
        if (total > 0 && completed === total) {
          count++
        }
      }
      
      return count
    })

    const categoryBreakdown = computed(() => {
      const startDateStr = getTrackingStartDate()
      const daysSinceStart = getDaysSinceStart()
      const daysToCheck = Math.min(7, daysSinceStart)
      
      return categories.value.map(cat => {
        const categoryHabits = habits.value.filter(h => h.categoryId === cat.id)
        
        if (categoryHabits.length === 0) {
          return { ...cat, completionRate: 0 }
        }
        
        let totalPercentage = 0
        let count = 0
        const base = new Date()
        
        for (let i = 0; i < daysToCheck; i++) {
          const d = new Date(base)
          d.setDate(d.getDate() - i)
          const dateStr = getDateString(d)
          
          // Skip days before tracking started
          if (dateStr < startDateStr) continue
          
          const dayOfWeek = d.getDay()
          
          let completed = 0
          let total = 0
          
          categoryHabits.forEach(h => {
            // Only count habits that existed on this date
            if (h.createdAt && h.createdAt > dateStr) return
            
            const activeDays = h.activeDays || [0, 1, 2, 3, 4, 5, 6]
            if (activeDays.includes(dayOfWeek)) {
              total++
              const cnt = h.days[dateStr] || 0
              if (cnt >= (h.dailyGoal || 1)) {
                completed++
              }
            }
          })
          
          if (total > 0) {
            totalPercentage += (completed / total) * 100
            count++
          }
        }
        
        return {
          ...cat,
          completionRate: count > 0 ? Math.round(totalPercentage / count) : 0
        }
      }).filter(cat => habits.value.some(h => h.categoryId === cat.id))
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
        const key = getDateString(d)
        
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

    function getCategoryColor(categoryId) {
      const category = categories.value.find(c => c.id === categoryId)
      return category ? category.color : '#667eea'
    }

    function getCategoryHabitCount(categoryId) {
      return habits.value.filter(h => h.categoryId === categoryId).length
    }

    // ============================================
    // DRAG AND DROP FUNCTIONS
    // ============================================

    function onDragStart(event, index) {
      draggedHabit.value = filteredHabits.value[index]
      draggedIndex.value = index
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', index)
      
      // Add dragging class after a small delay for visual feedback
      setTimeout(() => {
        const habitEl = event.target.closest('.habit')
        if (habitEl) habitEl.classList.add('dragging')
      }, 0)
    }

    function onDragOver(event, index) {
      if (draggedIndex.value === null || draggedIndex.value === index) return
      
      const draggedItem = filteredHabits.value[draggedIndex.value]
      const actualDraggedIndex = habits.value.findIndex(h => h.id === draggedItem.id)
      const targetItem = filteredHabits.value[index]
      const actualTargetIndex = habits.value.findIndex(h => h.id === targetItem.id)
      
      habits.value.splice(actualDraggedIndex, 1)
      habits.value.splice(actualTargetIndex, 0, draggedItem)
      draggedIndex.value = index
    }

    function onDragEnd() {
      draggedHabit.value = null
      draggedIndex.value = null
      
      // Remove dragging class from all habits
      document.querySelectorAll('.habit.dragging').forEach(el => {
        el.classList.remove('dragging')
      })
    }

    // Touch drag requires holding for 200ms before activating
    let touchHoldTimeout = null
    let touchDragActivated = ref(false)

    function onTouchStart(event, index) {
      touchStartY.value = event.touches[0].clientY
      touchCurrentIndex.value = index
      touchDragActivated.value = false
      
      // Start a timer - only activate drag after holding for 200ms
      touchHoldTimeout = setTimeout(() => {
        touchDragActivated.value = true
        draggedHabit.value = filteredHabits.value[index]
        draggedIndex.value = index
        
        // Add visual feedback
        const habitEl = event.target.closest('.habit')
        if (habitEl) {
          habitEl.classList.add('dragging')
          // Vibrate on mobile if supported
          if (navigator.vibrate) navigator.vibrate(50)
        }
      }, 200)
    }

    function onTouchMove(event) {
      const touchY = event.touches[0].clientY
      const deltaY = Math.abs(touchY - touchStartY.value)
      
      // If user moved finger significantly before hold time, cancel drag (they're scrolling)
      if (!touchDragActivated.value && deltaY > 10) {
        clearTimeout(touchHoldTimeout)
        touchHoldTimeout = null
        return
      }
      
      // Only reorder if drag was activated
      if (!touchDragActivated.value || draggedIndex.value === null) return

      const habitElements = document.querySelectorAll('.habit')
      
      habitElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect()

        if (touchY > rect.top && touchY < rect.bottom && index !== draggedIndex.value) {
          const draggedItem = filteredHabits.value[draggedIndex.value]
          const actualDraggedIndex = habits.value.findIndex(h => h.id === draggedItem.id)
          const targetItem = filteredHabits.value[index]
          const actualTargetIndex = habits.value.findIndex(h => h.id === targetItem.id)
          
          habits.value.splice(actualDraggedIndex, 1)
          habits.value.splice(actualTargetIndex, 0, draggedItem)
          draggedIndex.value = index
          
          // Vibrate on reorder
          if (navigator.vibrate) navigator.vibrate(30)
        }
      })
    }

    function onTouchEnd() {
      // Clear the hold timeout if it hasn't fired yet
      if (touchHoldTimeout) {
        clearTimeout(touchHoldTimeout)
        touchHoldTimeout = null
      }
      
      draggedHabit.value = null
      draggedIndex.value = null
      touchCurrentIndex.value = null
      touchDragActivated.value = false
      
      // Remove dragging class from all habits
      document.querySelectorAll('.habit.dragging').forEach(el => {
        el.classList.remove('dragging')
      })
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
        activeDays: [...selectedDays.value],
        categoryId: selectedCategoryId.value,
        createdAt: today()
      })
      
      showToast(`${newHabit.value} přidáno!`, '✨', 'success')
      
      newHabit.value = ''
      showModal.value = false
    }

    function closeModal() {
      showModal.value = false
      newHabit.value = ''
    }

    function addCategory() {
      if (!newCategoryName.value.trim()) return
      
      categories.value.push({
        id: Date.now(),
        name: newCategoryName.value,
        color: selectedColor.value
      })
      
      showToast(`Kategorie "${newCategoryName.value}" vytvořena!`, '🏷️', 'success')
      
      newCategoryName.value = ''
      showCategoryModal.value = false
    }

    function deleteCategory(categoryId) {
      // Remove category from habits
      habits.value.forEach(h => {
        if (h.categoryId === categoryId) {
          h.categoryId = null
        }
      })
      
      // Remove category
      categories.value = categories.value.filter(c => c.id !== categoryId)
      
      // Reset filter if this category was selected
      if (selectedCategory.value === categoryId) {
        selectedCategory.value = null
      }
      
      showToast('Kategorie smazána', '🗑️', 'success')
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
      
      const newCount = currentCount >= goal ? 0 : currentCount + 1
      habit.days[d] = newCount

      // Trigger celebration animation when completing
      if (newCount === goal) {
        triggerCelebration(habit.id)
      }

      if (newCount > 0) {
        nextTick(() => {
          generateCompletionToast(habit, newCount)
        })
      }
    }

    function triggerCelebration(habitId) {
      if (celebrationTimeout) {
        clearTimeout(celebrationTimeout)
      }
      
      celebratingHabitId.value = habitId
      
      celebrationTimeout = setTimeout(() => {
        celebratingHabitId.value = null
      }, 800)
    }

    // ============================================
    // EDIT HABIT FUNCTIONS
    // ============================================

    function openEditModal(habit) {
      habitToEdit.value = habit
      editShowCustom.value = habit.dailyGoal > 3
      editForm.value = {
        name: habit.name,
        icon: habit.icon,
        dailyGoal: habit.dailyGoal || 1,
        activeDays: [...(habit.activeDays || [0, 1, 2, 3, 4, 5, 6])],
        categoryId: habit.categoryId || null
      }
    }

    function toggleEditDay(day) {
      const index = editForm.value.activeDays.indexOf(day)
      
      if (index > -1) {
        if (editForm.value.activeDays.length > 1) {
          editForm.value.activeDays.splice(index, 1)
        }
      } else {
        editForm.value.activeDays.push(day)
      }
    }

    function saveHabitEdit() {
      if (!editForm.value.name.trim() || !habitToEdit.value) return
      
      const habit = habits.value.find(h => h.id === habitToEdit.value.id)
      if (habit) {
        habit.name = editForm.value.name
        habit.icon = editForm.value.icon
        habit.dailyGoal = editForm.value.dailyGoal
        habit.activeDays = [...editForm.value.activeDays]
        habit.categoryId = editForm.value.categoryId
        
        showToast(`${habit.name} aktualizováno!`, '✏️', 'success')
      }
      
      habitToEdit.value = null
    }

    // ============================================
    // RETURN PUBLIC API
    // ============================================
    
    return {
      // State
      habits,
      categories,
      newHabit,
      selectedIcon,
      dailyGoal,
      customGoal,
      showCustom,
      showModal,
      showCalendar,
      showSettings,
      showCategoryModal,
      habitToDelete,
      habitToEdit,
      editForm,
      editShowCustom,
      habitInput,
      calendarMonth,
      carouselRef,
      selectedDays,
      selectedCategoryId,
      selectedCategory,
      newCategoryName,
      selectedColor,
      draggedHabit,
      toast,
      celebratingHabitId,
      
      // Constants
      dayNames,
      availableIcons,
      availableColors,
      
      // Computed
      currentDate,
      calendarMonthLabel,
      calendarDays,
      carouselDays,
      filteredHabits,
      todayCompleted,
      todayTotal,
      totalHabits,
      bestStreak,
      totalCompletions,
      weeklyAnalytics,
      completionTrend,
      bestDayOfWeek,
      averageCompletionRate,
      perfectDays,
      categoryBreakdown,
      trackingDaysForAverage,
      trackingDaysForTrend,
      
      // Methods
      previousMonth,
      nextMonth,
      toggleDay,
      getActiveDaysText,
      getCategoryColor,
      getCategoryHabitCount,
      addHabit,
      closeModal,
      addCategory,
      deleteCategory,
      removeHabit,
      confirmDelete,
      toggleToday,
      getCompletionCount,
      isFullyDoneToday,
      isHabitActiveToday,
      getProgressPercent,
      streak,
      openEditModal,
      toggleEditDay,
      saveHabitEdit,
      
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