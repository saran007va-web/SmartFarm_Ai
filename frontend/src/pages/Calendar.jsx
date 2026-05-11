import { useState, useEffect, useMemo } from 'react'
import { Calendar, Plus, Trash2, CheckCircle2, Circle, Edit2, X, Droplet, Leaf, Zap, Bug, Scissors, Hammer, ChevronLeft, ChevronRight, AlertTriangle, TrendingUp, Clock, SkipForward, RotateCcw, Save } from 'lucide-react'
import TopBar from '../components/TopBar'
import EmptyState from '../components/EmptyState'
import { getCropPlans, createCropPlan, deleteCropPlan, createMaintenanceTask, getMaintenanceTasks, updateMaintenanceTask, deleteMaintenanceTask, getFarmProfiles, updateCropPlan } from '../services/api'
import CalendarDayCell from '../components/calendar/CalendarDayCell'
import TaskCard from '../components/calendar/TaskCard'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const TASK_ICONS = {
  'watering': { icon: Droplet, color: '#3b82f6', label: 'Watering' },
  'fertilizer': { icon: Leaf, color: '#10b981', label: 'Fertilizer' },
  'pesticide': { icon: Bug, color: '#ef4444', label: 'Pesticide' },
  'weeding': { icon: Scissors, color: '#f59e0b', label: 'Weeding' },
  'pruning': { icon: Scissors, color: '#8b5cf6', label: 'Pruning' },
  'harvesting': { icon: Hammer, color: '#f97316', label: 'Harvesting' },
  'other': { icon: Zap, color: '#6b7280', label: 'Other' },
}

const CROP_COLORS = {
  'rice': '#10b981',
  'wheat': '#3b82f6',
  'maize': '#f59e0b',
  'sugarcane': '#ef4444',
  'cotton': '#8b5cf6',
  'pulses': '#ec4899',
  'corn': '#f59e0b',
}

// Best practice crop cycles with yield impact factors
const CROP_CYCLES = {
  rice: {
    name: 'Rice (Paddy)',
    duration: 120, // days
    phases: [
      { name: 'Land Preparation', days: 15, tasks: ['watering', 'fertilizer'] },
      { name: 'Sowing', days: 5, tasks: ['watering'] },
      { name: 'Transplanting', days: 10, tasks: ['watering'] },
      { name: 'Vegetative Growth', days: 30, tasks: ['watering', 'fertilizer', 'pesticide'] },
      { name: 'Flowering', days: 20, tasks: ['watering', 'pesticide'] },
      { name: 'Grain Filling', days: 25, tasks: ['watering'] },
      { name: 'Harvesting', days: 15, tasks: ['harvesting'] },
    ],
    yieldImpact: {
      missed_watering: -8, // % yield loss per missed watering
      missed_fertilizer: -12, // % yield loss per missed fertilizer
      missed_pesticide: -15, // % yield loss per missed pesticide
    },
    recommendations: {
      watering: 'Water early morning or evening. Avoid midday irrigation.',
      fertilizer: 'Apply NPK in split doses - 50% at sowing, 25% at tillering, 25% at flowering.',
      pesticide: 'Check for pests weekly. Use integrated pest management.',
    }
  },
  wheat: {
    name: 'Wheat',
    duration: 120,
    phases: [
      { name: 'Land Prep', days: 10, tasks: ['fertilizer'] },
      { name: 'Sowing', days: 10, tasks: [] },
      { name: 'Germination', days: 15, tasks: ['watering'] },
      { name: 'Tillering', days: 25, tasks: ['fertilizer', 'watering'] },
      { name: 'Stem Extension', days: 20, tasks: ['watering', 'pesticide'] },
      { name: 'Flowering', days: 15, tasks: ['watering'] },
      { name: 'Grain Fill', days: 15, tasks: ['watering'] },
      { name: 'Harvesting', days: 10, tasks: ['harvesting'] },
    ],
    yieldImpact: {
      missed_watering: -6,
      missed_fertilizer: -10,
      missed_pesticide: -12,
    },
    recommendations: {
      watering: 'Critical at tillering and grain filling stages.',
      fertilizer: 'Apply urea in 2-3 split doses for better utilization.',
      pesticide: 'Watch for rust and aphid attacks.',
    }
  },
  maize: {
    name: 'Maize',
    duration: 90,
    phases: [
      { name: 'Prep', days: 7, tasks: ['fertilizer'] },
      { name: 'Sowing', days: 5, tasks: [] },
      { name: 'Emergence', days: 10, tasks: ['watering'] },
      { name: 'Vegetative', days: 25, tasks: ['watering', 'fertilizer'] },
      { name: 'Tasseling', days: 15, tasks: ['watering', 'pesticide'] },
      { name: 'Grain Fill', days: 20, tasks: ['watering'] },
      { name: 'Harvesting', days: 8, tasks: ['harvesting'] },
    ],
    yieldImpact: {
      missed_watering: -10,
      missed_fertilizer: -15,
      missed_pesticide: -10,
    },
    recommendations: {
      watering: 'Most critical during tasseling and grain fill.',
      fertilizer: 'High nitrogen requirement during vegetative growth.',
      pesticide: 'Control stem borers and fall armyworm.',
    }
  },
  tomato: {
    name: 'Tomato',
    duration: 75,
    phases: [
      { name: 'Nursery', days: 10, tasks: ['watering'] },
      { name: 'Transplant', days: 5, tasks: ['watering'] },
      { name: 'Vegetative', days: 20, tasks: ['watering', 'fertilizer'] },
      { name: 'Flowering', days: 15, tasks: ['watering', 'pruning'] },
      { name: 'Fruiting', days: 20, tasks: ['watering', 'pesticide'] },
      { name: 'Harvesting', days: 5, tasks: ['harvesting'] },
    ],
    yieldImpact: {
      missed_watering: -12,
      missed_fertilizer: -10,
      missed_pesticide: -20,
    },
    recommendations: {
      watering: 'Consistent moisture needed. Irregular watering causes blossom end rot.',
      fertilizer: 'Calcium nitrate helps prevent blossom end rot.',
      pesticide: 'Watch for whiteflies, hornworms, and bacterial wilt.',
    }
  },
  potato: {
    name: 'Potato',
    duration: 90,
    phases: [
      { name: 'Prep', days: 7, tasks: ['fertilizer'] },
      { name: 'Planting', days: 5, tasks: [] },
      { name: 'Sprout Dev', days: 15, tasks: ['watering'] },
      { name: 'Vegetative', days: 25, tasks: ['watering', 'hilling'] },
      { name: 'Tuber Init', days: 20, tasks: ['watering', 'fertilizer'] },
      { name: 'Maturation', days: 15, tasks: ['watering'] },
      { name: 'Harvesting', days: 3, tasks: ['harvesting'] },
    ],
    yieldImpact: {
      missed_watering: -8,
      missed_fertilizer: -10,
      missed_hilling: -15,
    },
    recommendations: {
      watering: 'Keep soil consistently moist but not waterlogged.',
      fertilizer: 'Potassium is crucial for tuber development.',
      hilling: 'Hill up soil around plants to prevent green tubers.',
    }
  },
}

// Default cycle for unknown crops
const DEFAULT_CYCLE = {
  name: 'General Crop',
  duration: 60,
  phases: [
    { name: 'Preparation', days: 10, tasks: ['fertilizer'] },
    { name: 'Sowing', days: 5, tasks: [] },
    { name: 'Growth', days: 30, tasks: ['watering', 'fertilizer'] },
    { name: 'Maintenance', days: 10, tasks: ['watering', 'pesticide'] },
    { name: 'Harvesting', days: 5, tasks: ['harvesting'] },
  ],
  yieldImpact: { missed_watering: -5, missed_fertilizer: -8, missed_pesticide: -10 },
  recommendations: { watering: 'Water regularly.', fertilizer: 'Apply balanced fertilizer.', pesticide: 'Monitor for pests.' }
}

// Recovery actions for missed tasks
const RECOVERY_ACTIONS = {
  watering: [
    { action: 'Double watering tomorrow', impact: 50, description: 'Compensate with double water quantity' },
    { action: 'Add organic mulch', impact: 30, description: 'Mulch to retain soil moisture' },
  ],
  fertilizer: [
    { action: 'Foliar spray application', impact: 70, description: 'Quick-absorbing foliar fertilizer' },
    { action: 'Compost top-dressing', impact: 40, description: 'Organic matter to boost soil' },
  ],
  pesticide: [
    { action: 'Immediate spray', impact: 80, description: 'Apply pesticide as soon as possible' },
    { action: 'Biological control', impact: 50, description: 'Use neem oil or beneficial insects' },
  ],
  default: [
    { action: 'Resume normal schedule', impact: 20, description: 'Continue with remaining tasks' },
  ]
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [cropPlans, setCropPlans] = useState([])
  const [tasks, setTasks] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [farms, setFarms] = useState([])
  const [selectedFarm, setSelectedFarm] = useState(null)

  // Modal states
  const [showAddCrop, setShowAddCrop] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showEditTask, setShowEditTask] = useState(false)
  const [showEditCropPlan, setShowEditCropPlan] = useState(false)
  const [showMissedTasks, setShowMissedTasks] = useState(false)
  const [showRecovery, setShowRecovery] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedCropPlan, setSelectedCropPlan] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)

  // Form states
  const [cropForm, setCropForm] = useState({ crop_name: '', area_ha: '', start_date: '', duration_days: '', growth_stages: '', status: 'active' })
  const [taskForm, setTaskForm] = useState({ task_type: 'watering', title: '', description: '', quantity: '', unit: '', priority: 'medium', status: 'planned', start_time: '', end_time: '', reminder_minutes: '', assigned_crop: '', growth_stage: '', notes: '' })
  const [taskEditForm, setTaskEditForm] = useState({ task_date: '', task_type: '', title: '', description: '', quantity: '', unit: '', priority: 'medium', status: 'planned', start_time: '', end_time: '', reminder_minutes: '', assigned_crop: '', growth_stage: '', notes: '' })
  const [cropEditForm, setCropEditForm] = useState({ crop_name: '', start_date: '', end_date: '', duration_days: '', growth_stages: '', status: 'active', farm_id: '', area_ha: '' })
  const [cropFormError, setCropFormError] = useState('')
  const [cropEditError, setCropEditError] = useState('')
  const [taskFormError, setTaskFormError] = useState('')
  const [creatingCrop, setCreatingCrop] = useState(false)
  const [creatingTask, setCreatingTask] = useState(false)
  const [updatingCrop, setUpdatingCrop] = useState(false)
  const [updatingTask, setUpdatingTask] = useState(false)

  // Yield tracking
  const [yieldImpacts, setYieldImpacts] = useState({})
  const [missedTasks, setMissedTasks] = useState([])

  const toDateInputValue = (date) => date.toISOString().split('T')[0]
  const toApiDateTime = (value) => {
    if (!value) return null
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return `${value}T00:00:00`
    }

    const date = value instanceof Date ? value : new Date(value)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}T00:00:00`
  }
  const normalizeTaskRecord = (task) => ({
    ...task,
    title: task.title || task.description || TASK_ICONS[task.task_type]?.label || task.task_type,
    priority: task.priority || (task.completed ? 'high' : 'medium'),
    status: task.status || (task.completed ? 'completed' : 'planned'),
    assigned_crop: task.assigned_crop || '',
    growth_stage: task.growth_stage || '',
    start_time: task.start_time || '',
    end_time: task.end_time || '',
    reminder_minutes: task.reminder_minutes ?? null,
    is_auto_generated: Boolean(task.is_auto_generated),
  })

  const groupTasksByDate = (taskList) => taskList.reduce((accumulator, task) => {
    if (!task.task_date) return accumulator
    const dateKey = task.task_date.split('T')[0]
    if (!accumulator[dateKey]) accumulator[dateKey] = []
    accumulator[dateKey].push(task)
    return accumulator
  }, {})

  const tasksByDate = useMemo(() => groupTasksByDate(tasks), [tasks])
  const tasksByPlanId = useMemo(() => tasks.reduce((accumulator, task) => {
    const planKey = String(task.crop_plan_id)
    if (!accumulator[planKey]) accumulator[planKey] = []
    accumulator[planKey].push(task)
    return accumulator
  }, {}), [tasks])

  const fromDate = cropForm.start_date ? new Date(cropForm.start_date) : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)

  useEffect(() => { loadFarms() }, [])
  useEffect(() => { loadCropPlans() }, [selectedFarm])

  const loadFarms = async () => {
    try {
      const resp = await getFarmProfiles()
      setFarms(resp.data.profiles || [])
    } catch (err) { console.error('Failed to load farms:', err) }
  }

  const loadCropPlans = async () => {
    setLoadingPlans(true)
    console.log('Loading crop plans, selectedFarm:', selectedFarm)
    try {
      const resp = await getCropPlans(selectedFarm)
      console.log('Crop plans response:', resp.data)
      const plans = resp.data.plans || []
      setCropPlans(plans)
      const taskList = await loadAllTasks(plans)
      calculateYieldImpacts(plans, taskList)
      console.log('Loaded', plans.length, 'plans and tasks list has', taskList.length, 'records')
    } catch (err) { console.error('Failed to load crop plans:', err) }
    finally { setLoadingPlans(false) }
  }

  const loadAllTasks = async (plans) => {
    const collectedTasks = []
    for (const plan of plans) {
      try {
        const resp = await getMaintenanceTasks(plan.id)
        resp.data.tasks.forEach(task => collectedTasks.push(normalizeTaskRecord(task)))
      } catch (err) { console.error(`Failed to load tasks for plan ${plan.id}:`, err) }
    }
    setTasks(collectedTasks)
    return collectedTasks
  }

  const calculateYieldImpacts = (plans, tasksListParam) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const impacts = {}
    const missed = []
    const taskListToUse = tasksListParam || tasks

    plans.forEach(plan => {
      const cycle = getCropCycle(plan.crop_name)
      let totalImpact = 0

      taskListToUse.forEach((task) => {
        const taskDate = new Date(task.task_date)
        if (task.crop_plan_id === plan.id && taskDate < today && !task.completed) {
          const taskType = task.task_type
          const impact = cycle.yieldImpact[`missed_${taskType}`] || -5
          totalImpact += impact
          missed.push({ ...task, plan_name: plan.crop_name, impact })
        }
      })

      impacts[plan.id] = Math.min(totalImpact, -50) // Cap at 50% max loss
    })

    setYieldImpacts(impacts)
    setMissedTasks(missed)
  }

  const getRecoveryActions = (taskType) => {
    return RECOVERY_ACTIONS[taskType] || RECOVERY_ACTIONS.default
  }

  const refreshTaskState = (updatedTask) => {
    const normalized = normalizeTaskRecord(updatedTask)
    setTasks((currentTasks) => {
      const withoutCurrent = currentTasks.filter((task) => task.id !== normalized.id)
      return [...withoutCurrent, normalized].sort((a, b) => new Date(a.task_date) - new Date(b.task_date))
    })
    return normalized
  }

  const removeTaskState = (taskId) => {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId))
  }

  const refreshPlanState = (updatedPlan) => {
    setCropPlans((currentPlans) => currentPlans.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan)))
  }

  const handleApplyRecovery = async (task, recoveryAction) => {
    try {
      // Mark task as completed with note about recovery
      const response = await updateMaintenanceTask(task.id, {
        completed: true,
        description: task.description + ` [Recovered: ${recoveryAction.action}]`
      })
      refreshTaskState(response.data)

      // Recalculate yield impacts
      loadCropPlans()
      setShowRecovery(null)
    } catch (err) {
      console.error('Failed to apply recovery:', err)
    }
  }

  const handleReschedule = async (task, newDate) => {
    try {
      const response = await updateMaintenanceTask(task.id, {
        task_date: toApiDateTime(newDate)
      })
      refreshTaskState(response.data)
      setShowEditTask(false)
      loadCropPlans()
    } catch (err) {
      console.error('Failed to reschedule task:', err)
    }
  }

  const handleBulkReschedule = async (taskType, daysShift) => {
    const tasksToReschedule = missedTasks.filter(t => t.task_type === taskType)

    for (const task of tasksToReschedule) {
      try {
        const currentDate = new Date(task.task_date)
        const newDate = new Date(currentDate.getTime() + daysShift * 24 * 60 * 60 * 1000)
        const response = await updateMaintenanceTask(task.id, {
          task_date: toApiDateTime(newDate)
        })
        refreshTaskState(response.data)
      } catch (err) {
        console.error('Failed to reschedule task:', err)
      }
    }

    loadCropPlans()
    setShowMissedTasks(false)
  }

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay()

  const formatInputDate = (value) => {
    if (!value) return ''
    return new Date(value).toISOString().split('T')[0]
  }

  // Generate tasks based on crop cycle
  const generateTasksFromCycle = (cycle, startDate, planId) => {
    const tasks = []
    let currentDate = new Date(startDate)

    cycle.phases.forEach(phase => {
      for (let day = 0; day < phase.days; day++) {
        phase.tasks.forEach(taskType => {
          // Add task every 2-3 days depending on task type
          if (taskType === 'watering' || day % 2 === 0) {
            const taskDate = new Date(currentDate)
            const [startTime, endTime] = getTaskDefaultWindow(taskType)
            const dayOffset = Math.max(0, Math.floor((taskDate - startDate) / (24 * 60 * 60 * 1000)))
            tasks.push({
              plan_id: planId,
              task_date: toApiDateTime(taskDate),
              task_type: taskType,
              title: `${phase.name} - ${TASK_ICONS[taskType]?.label || taskType}`,
              description: `${phase.name} - ${TASK_ICONS[taskType]?.label || taskType}`,
              start_time: startTime,
              end_time: endTime,
              priority: ['watering', 'pesticide', 'harvesting'].includes(taskType) ? 'high' : 'medium',
              status: 'planned',
              reminder_minutes: taskType === 'watering' ? 60 : 180,
              assigned_crop: cropForm.crop_name,
              growth_stage: phase.name,
              plan_day_offset: dayOffset,
              is_auto_generated: true,
            })
          }
        })
        currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
      }
    })

    return tasks
  }

  // Calculate what the recommended schedule would look like
  const getRecommendedSchedule = () => {
    if (!cropForm.crop_name.trim()) return []

    const cycle = getCropCycle(cropForm.crop_name)
    const startDate = fromDate
    const tasks = []

    let scheduleDate = new Date(startDate)
    cycle.phases.forEach(phase => {
      phase.tasks.forEach(taskType => {
        const taskDate = new Date(scheduleDate)
        tasks.push({
          date: taskDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          type: TASK_ICONS[taskType]?.label || taskType,
          phase: phase.name,
          priority: ['watering', 'pesticide', 'harvesting'].includes(taskType) ? 'High' : 'Medium',
        })
      })
      scheduleDate = new Date(scheduleDate.getTime() + phase.days * 24 * 60 * 60 * 1000)
    })

    return tasks
  }

  const handleAddCrop = async () => {
    setCropFormError('')
    if (!cropForm.crop_name.trim()) {
      setCropFormError('Please enter a crop name')
      return
    }
    setCreatingCrop(true)
    try {
      const startDate = cropForm.start_date ? new Date(cropForm.start_date) : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endDate = new Date(startDate)

      const cycle = getCropCycle(cropForm.crop_name)
      endDate.setDate(endDate.getDate() + cycle.duration)

      // Create crop plan first
      const resp = await createCropPlan({
        crop_name: cropForm.crop_name,
        start_date: toApiDateTime(startDate),
        end_date: toApiDateTime(endDate),
        duration_days: cycle.duration,
        growth_stages: cycle.phases,
        status: 'active',
        area_ha: cropForm.area_ha ? parseFloat(cropForm.area_ha) : null,
      }, selectedFarm)

      // Handle different response structures
      let planId = null
      if (resp.data?.plan?.id) {
        planId = resp.data.plan.id
      } else if (resp.data?.id) {
        planId = resp.data.id
      } else if (resp.data?.plans?.[0]?.id) {
        planId = resp.data.plans[0].id
      }

      console.log('Created plan, ID:', planId, 'Response:', resp.data)

      if (planId) {
        // Generate and create tasks based on crop cycle
        const tasks = generateTasksFromCycle(cycle, startDate, planId)
        console.log('Generating', tasks.length, 'tasks for plan', planId)
        for (const task of tasks) {
          try {
            await createMaintenanceTask(planId, {
              task_date: task.task_date,
              task_type: task.task_type,
              title: task.title,
              description: task.description,
              start_time: task.start_time,
              end_time: task.end_time,
              priority: task.priority,
              status: task.status,
              reminder_minutes: task.reminder_minutes,
              assigned_crop: task.assigned_crop,
              growth_stage: task.growth_stage,
              plan_day_offset: task.plan_day_offset,
              is_auto_generated: task.is_auto_generated,
            })
          } catch (taskErr) {
            console.warn('Failed to create auto task:', taskErr)
          }
        }
      } else {
        console.warn('Could not get plan ID from response')
      }

      setCropForm({ crop_name: '', area_ha: '' })
      setCropForm({ crop_name: '', area_ha: '', start_date: '' })
      setShowAddCrop(false)
      loadCropPlans()
    } catch (err) {
      setCropFormError(err.response?.data?.detail || err.message || 'Failed to create crop plan')
    } finally {
      setCreatingCrop(false)
    }
  }

  const openEditCropPlan = (plan) => {
    setSelectedCropPlan(plan)
    setCropEditForm({
      crop_name: plan.crop_name || '',
      start_date: formatInputDate(plan.start_date),
      end_date: formatInputDate(plan.end_date),
        duration_days: getPlanDuration(plan),
        growth_stages: (getPlanStages(plan) || []).map((stage) => `${stage.name} | ${stage.days}`).join('\n'),
        status: plan.status || 'active',
        farm_id: plan.farm_id ?? '',
      area_ha: plan.area_ha ?? '',
    })
    setCropEditError('')
    setShowEditCropPlan(true)
  }

  const handleUpdateCropPlan = async () => {
    if (!selectedCropPlan) return
    setCropEditError('')
    if (!cropEditForm.crop_name.trim()) {
      setCropEditError('Please enter a crop name')
      return
    }
    if (!cropEditForm.start_date || !cropEditForm.end_date) {
      setCropEditError('Please choose both start and end dates')
      return
    }

    setUpdatingCrop(true)
    try {
      const parsedStages = cropEditForm.growth_stages
        ? cropEditForm.growth_stages
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const [namePart, daysPart] = line.split('|').map((segment) => segment.trim())
              return { name: namePart || 'Stage', days: Number(daysPart) || 1 }
            })
        : getPlanStages(selectedCropPlan)

      const startDate = new Date(`${cropEditForm.start_date}T00:00:00`)
      const computedEndDate = cropEditForm.duration_days
        ? new Date(startDate)
        : new Date(`${cropEditForm.end_date}T00:00:00`)

      if (cropEditForm.duration_days) {
        computedEndDate.setDate(computedEndDate.getDate() + Number(cropEditForm.duration_days))
      }

      const response = await updateCropPlan(selectedCropPlan.id, {
        crop_name: cropEditForm.crop_name,
        start_date: toApiDateTime(cropEditForm.start_date),
        end_date: toApiDateTime(computedEndDate),
        duration_days: cropEditForm.duration_days ? Number(cropEditForm.duration_days) : undefined,
        growth_stages: parsedStages,
        status: cropEditForm.status,
        farm_id: cropEditForm.farm_id ? Number(cropEditForm.farm_id) : null,
        area_ha: cropEditForm.area_ha !== '' ? parseFloat(cropEditForm.area_ha) : null,
      })
      refreshPlanState(response.data)
      setShowEditCropPlan(false)
      loadCropPlans()
    } catch (err) {
      setCropEditError(err.response?.data?.detail || err.message || 'Failed to update crop plan')
    } finally {
      setUpdatingCrop(false)
    }
  }

  const handleAddTask = async () => {
    setTaskFormError('')
    if (!selectedCropPlan || !selectedDate) {
      setTaskFormError('Please select a crop plan and date')
      return
    }
    setCreatingTask(true)
    try {
      const [year, month, day] = selectedDate.split('-')
      const taskDate = toApiDateTime(new Date(year, parseInt(month) - 1, day))
      const response = await createMaintenanceTask(selectedCropPlan.id, {
        task_date: taskDate,
        task_type: taskForm.task_type,
        description: taskForm.description,
        quantity: taskForm.quantity ? parseFloat(taskForm.quantity) : null,
        unit: taskForm.unit,
        title: taskForm.title || taskForm.description || TASK_ICONS[taskForm.task_type]?.label || taskForm.task_type,
        priority: taskForm.priority || 'medium',
        status: taskForm.status || 'planned',
        start_time: taskForm.start_time || '',
        end_time: taskForm.end_time || '',
        reminder_minutes: taskForm.reminder_minutes ? parseInt(taskForm.reminder_minutes, 10) : null,
        assigned_crop: taskForm.assigned_crop || selectedCropPlan.crop_name,
        growth_stage: taskForm.growth_stage || getCurrentGrowthStage(selectedCropPlan, new Date(selectedDate)),
        notes: taskForm.notes || '',
        is_auto_generated: false,
      })
      refreshTaskState(response.data)
      setTaskForm({ task_type: 'watering', title: '', description: '', quantity: '', unit: '', priority: 'medium', status: 'planned', start_time: '', end_time: '', reminder_minutes: '', assigned_crop: '', growth_stage: '', notes: '' })
      setShowAddTask(false)
      loadCropPlans()
    } catch (err) {
      setTaskFormError(err.response?.data?.detail || err.message || 'Failed to create task')
    } finally {
      setCreatingTask(false)
    }
  }

  const handleUpdateTask = async () => {
    if (!selectedTask) return
    setUpdatingTask(true)
    try {
      const response = await updateMaintenanceTask(selectedTask.id, {
        task_date: toApiDateTime(taskEditForm.task_date),
        task_type: taskEditForm.task_type,
        title: taskEditForm.title,
        description: taskEditForm.description,
        quantity: taskEditForm.quantity ? parseFloat(taskEditForm.quantity) : null,
        unit: taskEditForm.unit,
        priority: taskEditForm.priority,
        status: taskEditForm.status,
        start_time: taskEditForm.start_time,
        end_time: taskEditForm.end_time,
        reminder_minutes: taskEditForm.reminder_minutes ? parseInt(taskEditForm.reminder_minutes, 10) : null,
        assigned_crop: taskEditForm.assigned_crop,
        growth_stage: taskEditForm.growth_stage,
        notes: taskEditForm.notes,
      })
      refreshTaskState(response.data)
      setShowEditTask(false)
      loadCropPlans()
    } catch (err) {
      console.error('Failed to update task:', err)
    } finally {
      setUpdatingTask(false)
    }
  }

  const handleToggleTask = async (task) => {
    try {
      const response = await updateMaintenanceTask(task.id, { completed: !task.completed, status: !task.completed ? 'completed' : 'planned' })
      refreshTaskState(response.data)
      loadCropPlans()
    } catch (err) { console.error('Failed to update task:', err) }
  }

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return
    try {
      await deleteMaintenanceTask(taskId)
      removeTaskState(taskId)
      loadCropPlans()
    } catch (err) { console.error('Failed to delete task:', err) }
  }

  const handleDeleteCrop = async (planId) => {
    if (!window.confirm('Delete this crop plan and all tasks?')) return
    try {
      await deleteCropPlan(planId)
      setCropPlans((currentPlans) => currentPlans.filter((plan) => plan.id !== planId))
      setTasks((currentTasks) => currentTasks.filter((task) => task.crop_plan_id !== planId))
      loadCropPlans()
    } catch (err) { console.error('Failed to delete crop plan:', err) }
  }

  const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const dayTasks = selectedDate ? (tasksByDate[selectedDate] || []) : []
  const dayPlans = selectedDate && cropPlans ? cropPlans.filter(p => {
    const pStart = new Date(p.start_date)
    const pEnd = new Date(p.end_date)
    const selected = new Date(selectedDate)
    return pStart <= selected && selected <= pEnd
  }) : []

  const calendarDays = []
  const firstDay = getFirstDayOfMonth(currentDate)
  const daysInMonth = getDaysInMonth(currentDate)

  for (let i = 0; i < firstDay; i++) calendarDays.push(null)
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i)

  const getCropCycle = (cropName) => {
    if (!cropName) return DEFAULT_CYCLE
    const key = cropName.toLowerCase()
    // Check direct key match
    if (CROP_CYCLES[key]) return CROP_CYCLES[key]
    // Check by name match
    for (const [k, v] of Object.entries(CROP_CYCLES)) {
      if (v.name.toLowerCase() === key || v.name.toLowerCase().includes(key)) {
        return v
      }
    }
    // Check partial match (e.g., "rice" matches "Rice (Paddy)")
    for (const [k, v] of Object.entries(CROP_CYCLES)) {
      if (k.includes(key) || key.includes(k)) {
        return v
      }
    }
    return DEFAULT_CYCLE
  }

  const getFarmName = (farmId) => farms.find((farm) => farm.id === farmId)?.name || 'All Farms'

  const getPlanStages = (plan) => (Array.isArray(plan.growth_stages) && plan.growth_stages.length > 0 ? plan.growth_stages : getCropCycle(plan.crop_name).phases)

  const getPlanDuration = (plan) => plan.duration_days || Math.max(1, Math.round((new Date(plan.end_date) - new Date(plan.start_date)) / (24 * 60 * 60 * 1000)))

  const getCurrentGrowthStage = (plan, referenceDate = new Date()) => {
    const stages = getPlanStages(plan)
    const startDate = new Date(plan.start_date)
    const dayOffset = Math.max(0, Math.floor((referenceDate - startDate) / (24 * 60 * 60 * 1000)))
    let cursor = 0

    for (const stage of stages) {
      cursor += Number(stage.days || 1)
      if (dayOffset < cursor) {
        return stage.name || 'Active'
      }
    }

    return stages.at(-1)?.name || 'Active'
  }

  const getTaskDefaultWindow = (taskType) => {
    const mapping = {
      watering: ['06:00', '07:00'],
      fertilizer: ['07:30', '08:30'],
      pesticide: ['08:00', '09:00'],
      weeding: ['09:00', '11:00'],
      pruning: ['09:00', '11:00'],
      harvesting: ['06:00', '10:00'],
    }

    return mapping[taskType] || ['08:00', '09:00']
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <TopBar title="Crop Calendar & Planning" subtitle="Plan crops and manage daily maintenance tasks" />

      <div className="page-container">
        {/* Missed Tasks Alert */}
        {missedTasks.length > 0 && (
          <div
            className="mb-6 p-4 rounded-xl flex items-center justify-between"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} style={{ color: '#ef4444' }} />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                  {missedTasks.length} Missed Task{missedTasks.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  May affect crop yield. Click to view recovery options.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowMissedTasks(true)}
              className="btn btn-primary btn-sm"
            >
              <SkipForward size={14} /> View & Recover
            </button>
          </div>
        )}

        {/* Farm Selector */}
        <div className="card mb-6" style={{ padding: '16px 20px', borderColor: 'var(--color-border)' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '8px', display: 'block' }}>
            SELECT FARM
          </label>
          <select
            value={selectedFarm || ''}
            onChange={(e) => setSelectedFarm(e.target.value ? parseInt(e.target.value) : null)}
            className="input"
            style={{ fontSize: '0.875rem' }}
          >
            <option value="">All Farms</option>
            {farms.map(farm => (
              <option key={farm.id} value={farm.id}>{farm.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Month Navigation */}
            <div className="card" style={{ padding: '20px', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--color-text)' }}>
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} className="btn btn-ghost btn-icon btn-sm">
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={() => setCurrentDate(new Date())} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>Today</button>
                  <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} className="btn btn-ghost btn-icon btn-sm">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="space-y-2">
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {DAYS.map(day => (
                    <div key={day} className="text-center py-2 text-xs font-bold uppercase" style={{ color: 'var(--color-text-muted)' }}>{day}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} />

                    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                    const dateStr = dateKey(date)
                    const isToday = dateKey(new Date()) === dateStr
                    const isPast = date < new Date() && !isToday
                    const activePlans = cropPlans.filter((plan) => {
                      const pStart = new Date(plan.start_date)
                      const pEnd = new Date(plan.end_date)
                      return pStart <= date && date <= pEnd
                    })

                    return (
                      <CalendarDayCell
                        key={dateStr}
                        day={day}
                        dateStr={dateStr}
                        tasks={tasksByDate[dateStr] || []}
                        activePlans={activePlans}
                        isToday={isToday}
                        isSelected={selectedDate === dateStr}
                        isPast={isPast}
                        taskVisuals={TASK_ICONS}
                        onSelect={setSelectedDate}
                      />
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Active Crop Plans with Yield Impact */}
            <div className="card" style={{ padding: '24px', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--color-text)' }}>Active Crop Plans</h3>
                <button onClick={() => setShowAddCrop(true)} className="btn btn-primary btn-sm">
                  <Plus size={14} /> Add Crop Plan
                </button>
              </div>

              {loadingPlans ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-muted)' }}>
                  <div className="spinner mx-auto mb-2"></div>Loading...
                </div>
              ) : cropPlans.length === 0 ? (
                <EmptyState icon={Calendar} title="No crop plans" description="Create your first crop plan to get started." className="py-8" />
              ) : (
                <div className="space-y-3">
                  {cropPlans.map((plan) => {
                    const startDate = new Date(plan.start_date)
                    const endDate = new Date(plan.end_date)
                    const impact = yieldImpacts[plan.id] || 0
                    const planTasks = tasksByPlanId[String(plan.id)] || []
                    const currentStage = getCurrentGrowthStage(plan, selectedDate ? new Date(selectedDate) : new Date())

                    return (
                      <div
                        key={plan.id}
                        className="rounded-2xl border transition-all duration-200"
                        style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)', padding: '16px' }}
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1.5">
                              <span className="w-3 h-3 rounded-full" style={{ background: CROP_COLORS[plan.crop_name.toLowerCase()] || '#6b7280' }} />
                              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-text)' }}>{plan.crop_name}</h4>
                              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(16, 185, 129, 0.10)', color: 'var(--color-primary)' }}>
                                {plan.status || 'active'}
                              </span>
                              {impact < 0 && (
                                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ color: '#fca5a5', background: 'rgba(239,68,68,0.12)' }}>
                                  <TrendingUp size={12} />{impact}%
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                              {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                              {plan.area_ha && ` • ${plan.area_ha} ha`}
                              {plan.farm_id ? ` • ${getFarmName(plan.farm_id)}` : ''}
                            </p>
                          </div>

                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => openEditCropPlan(plan)} className="btn btn-ghost btn-icon btn-sm" title="Edit plan"><Edit2 size={16} /></button>
                            <button onClick={() => { setSelectedCropPlan(plan); setShowAddTask(true) }} className="btn btn-ghost btn-icon btn-sm" title="Add task"><Plus size={16} /></button>
                            <button onClick={() => handleDeleteCrop(plan.id)} className="btn btn-ghost btn-icon btn-sm" title="Delete"><Trash2 size={16} style={{ color: '#ef4444' }} /></button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                          <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <p style={{ color: 'var(--color-text-muted)' }}>Duration</p>
                            <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{getPlanDuration(plan)} days</p>
                          </div>
                          <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <p style={{ color: 'var(--color-text-muted)' }}>Current stage</p>
                            <p className="font-semibold truncate" style={{ color: 'var(--color-text)' }}>{currentStage}</p>
                          </div>
                          <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <p style={{ color: 'var(--color-text-muted)' }}>Tasks</p>
                            <p className="font-semibold" style={{ color: 'var(--color-text)' }}>{planTasks.length}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Selected Day Details */}
          <div className="card lg:sticky lg:top-6" style={{ padding: '24px', borderColor: 'var(--color-border)', height: 'fit-content' }}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--color-text)' }}>
                  {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'Select a date'}
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Weather preview: coming soon
                </p>
              </div>
              {selectedDate && <button onClick={() => setSelectedDate(null)} className="btn btn-ghost btn-icon btn-sm"><X size={16} /></button>}
            </div>

            {selectedDate ? (
              <div className="space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
                {dayPlans.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>ACTIVE CROPS ({dayPlans.length})</p>
                      <button onClick={() => { setSelectedCropPlan(dayPlans[0]); setShowEditCropPlan(true) }} className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', padding: '6px 10px' }}>
                        <Edit2 size={12} /> Edit Plan
                      </button>
                    </div>
                    <div className="space-y-2">
                      {dayPlans.map((plan) => {
                        const cycle = getCropCycle(plan.crop_name)
                        const currentStage = getCurrentGrowthStage(plan, new Date(selectedDate))

                        return (
                          <div key={plan.id} className="rounded-2xl p-3" style={{ background: `${CROP_COLORS[plan.crop_name.toLowerCase()] || '#6b7280'}12`, border: `1px solid ${CROP_COLORS[plan.crop_name.toLowerCase()] || '#6b7280'}40` }}>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--color-text)' }}>{plan.crop_name}</p>
                              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.10)', color: 'var(--color-primary)' }}>
                                {plan.status || 'active'}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Duration: {getPlanDuration(plan)} days</p>
                            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Stage: {currentStage}</p>
                            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Farm: {getFarmName(plan.farm_id)}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>TASKS ({dayTasks.length})</p>
                      <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>Tap a card to edit priority, status, times, notes, and reminders.</p>
                    </div>
                    {dayPlans.length > 0 && (
                      <button onClick={() => { setSelectedCropPlan(dayPlans[0]); setShowAddTask(true) }} className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                        <Plus size={12} /> Add Task
                      </button>
                    )}
                  </div>

                  {dayTasks.length === 0 ? (
                    <EmptyState icon={Calendar} title="No tasks scheduled" description="Add a task for this day or select another date to inspect scheduled work." className="py-8" />
                  ) : (
                    <div className="space-y-3">
                      {[...dayTasks]
                        .sort((a, b) => new Date(a.task_date) - new Date(b.task_date))
                        .map((task) => {
                          const cropName = cropPlans.find((plan) => plan.id === task.crop_plan_id)?.crop_name
                          const farmName = cropPlans.find((plan) => plan.id === task.crop_plan_id)?.farm_id ? getFarmName(cropPlans.find((plan) => plan.id === task.crop_plan_id)?.farm_id) : ''

                          return (
                            <TaskCard
                              key={task.id}
                              task={task}
                              taskVisual={TASK_ICONS[task.task_type] || {}}
                              cropName={cropName}
                              farmName={farmName}
                              onToggleComplete={handleToggleTask}
                              onEdit={(selected) => {
                                setSelectedTask(selected)
                                setTaskEditForm({
                                  task_date: formatInputDate(selected.task_date),
                                  task_type: selected.task_type,
                                  title: selected.title || '',
                                  description: selected.description || '',
                                  quantity: selected.quantity || '',
                                  unit: selected.unit || '',
                                  priority: selected.priority || 'medium',
                                  status: selected.status || (selected.completed ? 'completed' : 'planned'),
                                  start_time: selected.start_time || '',
                                  end_time: selected.end_time || '',
                                  reminder_minutes: selected.reminder_minutes ?? '',
                                  assigned_crop: selected.assigned_crop || cropName || '',
                                  growth_stage: selected.growth_stage || '',
                                  notes: selected.notes || '',
                                })
                                setShowEditTask(true)
                              }}
                              onDelete={(selected) => handleDeleteTask(selected.id)}
                              onPriorityChange={async (selected, priority) => {
                                const response = await updateMaintenanceTask(selected.id, { priority })
                                refreshTaskState(response.data)
                              }}
                              onStatusChange={async (selected, status) => {
                                const response = await updateMaintenanceTask(selected.id, {
                                  status,
                                  completed: status === 'completed',
                                })
                                refreshTaskState(response.data)
                              }}
                              onReschedule={(selected) => {
                                setSelectedTask(selected)
                                setTaskEditForm({
                                  task_date: formatInputDate(selected.task_date),
                                  task_type: selected.task_type,
                                  title: selected.title || '',
                                  description: selected.description || '',
                                  quantity: selected.quantity || '',
                                  unit: selected.unit || '',
                                  priority: selected.priority || 'medium',
                                  status: selected.status || 'planned',
                                  start_time: selected.start_time || '',
                                  end_time: selected.end_time || '',
                                  reminder_minutes: selected.reminder_minutes ?? '',
                                  assigned_crop: selected.assigned_crop || cropName || '',
                                  growth_stage: selected.growth_stage || '',
                                  notes: selected.notes || '',
                                })
                                setShowEditTask(true)
                              }}
                            />
                          )
                        })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <EmptyState icon={Calendar} title="Select a date" description="Click on a calendar date to view and manage tasks." className="py-12" />
            )}
          </div>
        </div>
      </div>

      {/* Add Crop Plan Modal */}
      {showAddCrop && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAddCrop(false)}>
          <div className="card" style={{ padding: '24px', borderColor: 'var(--color-border)', maxWidth: '450px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--color-text)' }}>Add Crop Plan</h3>
              <button onClick={() => setShowAddCrop(false)} className="btn btn-ghost btn-icon"><X size={20} /></button>
            </div>

            {/* Crop Recommendations */}
            <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--color-text-muted)' }}>RECOMMENDED CROPS</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(CROP_CYCLES).map(([key, cycle]) => (
                  <button key={key} onClick={() => setCropForm({ ...cropForm, crop_name: cycle.name })} className="px-2 py-1 text-xs rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                    {cycle.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Crop Name</label>
                <input type="text" value={cropForm.crop_name} onChange={(e) => setCropForm({ ...cropForm, crop_name: e.target.value })} placeholder="e.g., Rice, Wheat, Maize..." className="input" style={{ marginTop: '6px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Area (Hectares)</label>
                <input type="number" step="0.1" value={cropForm.area_ha} onChange={(e) => setCropForm({ ...cropForm, area_ha: e.target.value })} placeholder="e.g., 2.5" className="input" style={{ marginTop: '6px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>From Date</label>
                <input
                  type="date"
                  value={cropForm.start_date || toDateInputValue(fromDate)}
                  onChange={(e) => setCropForm({ ...cropForm, start_date: e.target.value })}
                  className="input"
                  style={{ marginTop: '6px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Planned Duration (days)</label>
                <input type="number" min="1" value={cropForm.duration_days} onChange={(e) => setCropForm({ ...cropForm, duration_days: e.target.value })} placeholder="Auto from crop cycle" className="input" style={{ marginTop: '6px' }} />
              </div>

              {cropForm.crop_name && (() => {
                const cycle = getCropCycle(cropForm.crop_name)
                const schedule = getRecommendedSchedule()
                const plannedEndDate = new Date(fromDate)
                plannedEndDate.setDate(plannedEndDate.getDate() + cycle.duration)
                return (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-primary)' }}>{cycle.name} Cycle</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Duration: {cycle.duration} days</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Planned window: {fromDate.toLocaleDateString()} → {plannedEndDate.toLocaleDateString()}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Phases: {cycle.phases.map(p => p.name).join(' → ')}</p>
                    </div>

                    {/* Task Schedule Preview */}
                    <div className="p-3 rounded-lg" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>AUTO-GENERATED TASKS ({schedule.length})</p>
                        <span className="text-xs" style={{ color: 'var(--color-primary)' }}>Best Practice</span>
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {schedule.slice(0, 10).map((task, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span style={{ color: 'var(--color-text)' }}>{task.date}</span>
                            <span style={{ color: 'var(--color-text-muted)' }}>{task.type}</span>
                          </div>
                        ))}
                        {schedule.length > 10 && (
                          <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>+{schedule.length - 10} more tasks</p>
                        )}
                      </div>
                    </div>

                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      💡 Tasks will be auto-generated based on best practices. You can edit/delete them after creation.
                    </p>
                  </div>
                )
              })()}
            </div>

            {cropFormError && <div style={{ padding: '10px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', fontSize: '0.875rem', color: '#ef4444', marginBottom: '12px' }}>{cropFormError}</div>}

            <button onClick={handleAddCrop} disabled={creatingCrop} className="btn btn-primary w-full" style={{ opacity: creatingCrop ? 0.6 : 1 }}>
              <Plus size={16} /> {creatingCrop ? 'Creating...' : 'Create Plan'}
            </button>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTask && selectedCropPlan && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowAddTask(false)}>
          <div className="card" style={{ padding: '24px', borderColor: 'var(--color-border)', maxWidth: '400px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--color-text)' }}>Add Maintenance Task</h3>
              <button onClick={() => setShowAddTask(false)} className="btn btn-ghost btn-icon"><X size={20} /></button>
            </div>

            {/* Recommendations */}
            {(() => {
              const cycle = getCropCycle(selectedCropPlan.crop_name)
              const taskRec = cycle.recommendations[taskForm.task_type]
              return taskRec ? (
                <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <p className="text-xs font-semibold mb-1" style={{ color: '#3b82f6' }}>💡 Recommendation</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{taskRec}</p>
                </div>
              ) : null
            })()}

            <div className="space-y-4 mb-6">
              <div><label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Crop: {selectedCropPlan.crop_name}</label></div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Task Type</label>
                <select value={taskForm.task_type} onChange={(e) => setTaskForm({ ...taskForm, task_type: e.target.value })} className="input" style={{ marginTop: '6px' }}>
                  {Object.entries(TASK_ICONS).map(([key, { label }]) => (<option key={key} value={key}>{label}</option>))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Title</label>
                <input type="text" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Short task title" className="input" style={{ marginTop: '6px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Description</label>
                <input type="text" value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} placeholder="e.g., Light watering in morning..." className="input" style={{ marginTop: '6px' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Quantity</label>
                  <input type="number" step="0.1" value={taskForm.quantity} onChange={(e) => setTaskForm({ ...taskForm, quantity: e.target.value })} placeholder="e.g., 20" className="input" style={{ marginTop: '6px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Unit</label>
                  <input type="text" value={taskForm.unit} onChange={(e) => setTaskForm({ ...taskForm, unit: e.target.value })} placeholder="e.g., mm, kg, ml" className="input" style={{ marginTop: '6px' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Start Time</label>
                  <input type="time" value={taskForm.start_time} onChange={(e) => setTaskForm({ ...taskForm, start_time: e.target.value })} className="input" style={{ marginTop: '6px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>End Time</label>
                  <input type="time" value={taskForm.end_time} onChange={(e) => setTaskForm({ ...taskForm, end_time: e.target.value })} className="input" style={{ marginTop: '6px' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Priority</label>
                  <select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })} className="input" style={{ marginTop: '6px' }}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Status</label>
                  <select value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })} className="input" style={{ marginTop: '6px' }}>
                    <option value="planned">Planned</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                    <option value="missed">Missed</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Reminder (minutes)</label>
                  <input type="number" min="0" value={taskForm.reminder_minutes} onChange={(e) => setTaskForm({ ...taskForm, reminder_minutes: e.target.value })} className="input" style={{ marginTop: '6px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Assigned Crop</label>
                  <input type="text" value={taskForm.assigned_crop} onChange={(e) => setTaskForm({ ...taskForm, assigned_crop: e.target.value })} className="input" style={{ marginTop: '6px' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Growth Stage</label>
                <input type="text" value={taskForm.growth_stage} onChange={(e) => setTaskForm({ ...taskForm, growth_stage: e.target.value })} className="input" style={{ marginTop: '6px' }} placeholder="Auto-filled from crop stage" />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Notes</label>
                <textarea value={taskForm.notes} onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })} className="input" rows={3} style={{ marginTop: '6px', resize: 'vertical' }} />
              </div>
            </div>

            {taskFormError && <div style={{ padding: '10px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', fontSize: '0.875rem', color: '#ef4444', marginBottom: '12px' }}>{taskFormError}</div>}

            <button onClick={handleAddTask} disabled={creatingTask} className="btn btn-primary w-full" style={{ opacity: creatingTask ? 0.6 : 1 }}>
              <Plus size={16} /> {creatingTask ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </div>
      )}

      {/* Edit Crop Plan Modal */}
      {showEditCropPlan && selectedCropPlan && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowEditCropPlan(false)}>
          <div className="card" style={{ padding: '24px', borderColor: 'var(--color-border)', maxWidth: '450px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--color-text)' }}>Edit Crop Plan</h3>
              <button onClick={() => setShowEditCropPlan(false)} className="btn btn-ghost btn-icon"><X size={20} /></button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Crop Name</label>
                <input type="text" value={cropEditForm.crop_name} onChange={(e) => setCropEditForm({ ...cropEditForm, crop_name: e.target.value })} className="input" style={{ marginTop: '6px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Start Date</label>
                <input type="date" value={cropEditForm.start_date} onChange={(e) => setCropEditForm({ ...cropEditForm, start_date: e.target.value })} className="input" style={{ marginTop: '6px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>End Date</label>
                <input type="date" value={cropEditForm.end_date} onChange={(e) => setCropEditForm({ ...cropEditForm, end_date: e.target.value })} className="input" style={{ marginTop: '6px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Duration (days)</label>
                <input type="number" min="1" value={cropEditForm.duration_days} onChange={(e) => setCropEditForm({ ...cropEditForm, duration_days: e.target.value })} className="input" style={{ marginTop: '6px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Farm</label>
                <select value={cropEditForm.farm_id} onChange={(e) => setCropEditForm({ ...cropEditForm, farm_id: e.target.value })} className="input" style={{ marginTop: '6px' }}>
                  <option value="">All Farms</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>{farm.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Status</label>
                <select value={cropEditForm.status} onChange={(e) => setCropEditForm({ ...cropEditForm, status: e.target.value })} className="input" style={{ marginTop: '6px' }}>
                  <option value="active">Active</option>
                  <option value="planned">Planned</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Growth Stages</label>
                <textarea
                  value={cropEditForm.growth_stages}
                  onChange={(e) => setCropEditForm({ ...cropEditForm, growth_stages: e.target.value })}
                  className="input"
                  rows={5}
                  placeholder={"Land Preparation | 15\nSowing | 5\nVegetative Growth | 30"}
                  style={{ marginTop: '6px', resize: 'vertical' }}
                />
                <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-muted)' }}>Format: Stage name | days per line</p>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Area (Hectares)</label>
                <input type="number" step="0.1" value={cropEditForm.area_ha} onChange={(e) => setCropEditForm({ ...cropEditForm, area_ha: e.target.value })} className="input" style={{ marginTop: '6px' }} />
              </div>
            </div>

            {cropEditError && <div style={{ padding: '10px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', fontSize: '0.875rem', color: '#ef4444', marginBottom: '12px' }}>{cropEditError}</div>}

            <button onClick={handleUpdateCropPlan} disabled={updatingCrop} className="btn btn-primary w-full" style={{ opacity: updatingCrop ? 0.6 : 1 }}>
              <Save size={16} /> {updatingCrop ? 'Saving...' : 'Save Plan Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditTask && selectedTask && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowEditTask(false)}>
          <div className="card" style={{ padding: '24px', borderColor: 'var(--color-border)', maxWidth: '400px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--color-text)' }}>Edit Task</h3>
              <button onClick={() => setShowEditTask(false)} className="btn btn-ghost btn-icon"><X size={20} /></button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Date</label>
                <input type="date" value={taskEditForm.task_date} onChange={(e) => setTaskEditForm({ ...taskEditForm, task_date: e.target.value })} className="input" style={{ marginTop: '6px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Task Type</label>
                <select value={taskEditForm.task_type} onChange={(e) => setTaskEditForm({ ...taskEditForm, task_type: e.target.value })} className="input" style={{ marginTop: '6px' }}>
                  {Object.entries(TASK_ICONS).map(([key, { label }]) => (<option key={key} value={key}>{label}</option>))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Title</label>
                <input type="text" value={taskEditForm.title} onChange={(e) => setTaskEditForm({ ...taskEditForm, title: e.target.value })} className="input" style={{ marginTop: '6px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Description</label>
                <input type="text" value={taskEditForm.description} onChange={(e) => setTaskEditForm({ ...taskEditForm, description: e.target.value })} className="input" style={{ marginTop: '6px' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Quantity</label>
                  <input type="number" step="0.1" value={taskEditForm.quantity} onChange={(e) => setTaskEditForm({ ...taskEditForm, quantity: e.target.value })} className="input" style={{ marginTop: '6px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Unit</label>
                  <input type="text" value={taskEditForm.unit} onChange={(e) => setTaskEditForm({ ...taskEditForm, unit: e.target.value })} className="input" style={{ marginTop: '6px' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Start Time</label>
                  <input type="time" value={taskEditForm.start_time} onChange={(e) => setTaskEditForm({ ...taskEditForm, start_time: e.target.value })} className="input" style={{ marginTop: '6px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>End Time</label>
                  <input type="time" value={taskEditForm.end_time} onChange={(e) => setTaskEditForm({ ...taskEditForm, end_time: e.target.value })} className="input" style={{ marginTop: '6px' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Priority</label>
                  <select value={taskEditForm.priority} onChange={(e) => setTaskEditForm({ ...taskEditForm, priority: e.target.value })} className="input" style={{ marginTop: '6px' }}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Status</label>
                  <select value={taskEditForm.status} onChange={(e) => setTaskEditForm({ ...taskEditForm, status: e.target.value })} className="input" style={{ marginTop: '6px' }}>
                    <option value="planned">Planned</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                    <option value="missed">Missed</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Reminder (minutes)</label>
                  <input type="number" min="0" value={taskEditForm.reminder_minutes} onChange={(e) => setTaskEditForm({ ...taskEditForm, reminder_minutes: e.target.value })} className="input" style={{ marginTop: '6px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Assigned Crop</label>
                  <input type="text" value={taskEditForm.assigned_crop} onChange={(e) => setTaskEditForm({ ...taskEditForm, assigned_crop: e.target.value })} className="input" style={{ marginTop: '6px' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Growth Stage</label>
                <input type="text" value={taskEditForm.growth_stage} onChange={(e) => setTaskEditForm({ ...taskEditForm, growth_stage: e.target.value })} className="input" style={{ marginTop: '6px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)' }}>Notes</label>
                <textarea value={taskEditForm.notes} onChange={(e) => setTaskEditForm({ ...taskEditForm, notes: e.target.value })} className="input" rows={3} style={{ marginTop: '6px', resize: 'vertical' }} />
              </div>
            </div>

            <button onClick={handleUpdateTask} disabled={updatingTask} className="btn btn-primary w-full" style={{ opacity: updatingTask ? 0.6 : 1 }}>
              <Save size={16} /> {updatingTask ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Missed Tasks Recovery Modal */}
      {showMissedTasks && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowMissedTasks(false)}>
          <div className="card" style={{ padding: '24px', borderColor: 'var(--color-border)', maxWidth: '500px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--color-text)' }}>Missed Tasks & Recovery</h3>
              <button onClick={() => setShowMissedTasks(false)} className="btn btn-ghost btn-icon"><X size={20} /></button>
            </div>

            {/* Bulk Actions */}
            <div className="mb-4 p-3 rounded-lg" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--color-text-muted)' }}>BULK RESCHEDULE</p>
              <div className="flex gap-2">
                <button onClick={() => handleBulkReschedule('watering', 1)} className="btn btn-sm flex-1">Move +1 day</button>
                <button onClick={() => handleBulkReschedule('fertilizer', 1)} className="btn btn-sm flex-1">Move +1 day</button>
                <button onClick={() => handleBulkReschedule('pesticide', 1)} className="btn btn-sm flex-1">Move +1 day</button>
              </div>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {missedTasks.map(task => (
                <div key={task.id} className="p-3 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{task.plan_name}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{new Date(task.task_date).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-lg" style={{ background: '#ef444420', color: '#ef4444' }}>{task.impact}% yield impact</span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={12} style={{ color: '#ef4444' }} />
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Missed: {TASK_ICONS[task.task_type]?.label}</span>
                  </div>

                  <div className="flex gap-1">
                    {getRecoveryActions(task.task_type).map((action, i) => (
                      <button key={i} onClick={() => handleApplyRecovery(task, action)} className="btn btn-sm" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                        {action.action}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setShowMissedTasks(false)} className="btn btn-secondary w-full mt-4">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}