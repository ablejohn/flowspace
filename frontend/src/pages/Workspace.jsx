import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { useWebSocket } from '../hooks/useWebSocket'
import api from '../lib/api'
import TaskCard from '../components/TaskCard'
import TaskModal from '../components/TaskModal'
import styles from './Workspace.module.css'

const COLUMNS = [
  { id: 'TODO',        label: 'To Do',       color: '#6366f1' },
  { id: 'IN_PROGRESS', label: 'In Progress',  color: '#f59e0b' },
  { id: 'IN_REVIEW',   label: 'In Review',    color: '#8b5cf6' },
  { id: 'DONE',        label: 'Done',         color: '#4ade80' },
]

export default function Workspace() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const user      = useAuthStore(s => s.user)
  const token     = useAuthStore(s => s.token)
  const logout    = useAuthStore(s => s.logout)

  const [workspace, setWorkspace]       = useState(null)
  const [tasks, setTasks]               = useState([])
  const [onlineUsers, setOnlineUsers]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [selectedTask, setSelectedTask] = useState(null)
  const [showNewTask, setShowNewTask]   = useState(false)
  const [newTaskCol, setNewTaskCol]     = useState('TODO')
  const [showInvite, setShowInvite]     = useState(false)
  const [inviteEmail, setInviteEmail]   = useState('')
  const [inviteMsg, setInviteMsg]       = useState('')

  const dragTask = useRef(null)
  const [dragOver, setDragOver] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get(`/workspaces/${id}`),
      api.get(`/tasks?workspaceId=${id}`)
    ]).then(([wsRes, tasksRes]) => {
      setWorkspace(wsRes.data)
      setOnlineUsers([])
      setTasks(tasksRes.data)
      setLoading(false)
    }).catch(() => navigate('/'))
  }, [id, navigate])

  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      case 'TASK_CREATED':
        setTasks(t => t.find(x => x.id === msg.payload.id) ? t : [msg.payload, ...t]); break
      case 'TASK_UPDATED':
        setTasks(t => t.map(task => task.id === msg.payload.id ? { ...task, ...msg.payload } : task)); break
      case 'TASK_DELETED':
        setTasks(t => t.filter(task => task.id !== msg.payload.taskId)); break
      case 'USER_JOINED':
        setOnlineUsers(u => [...u.filter(x => x.userId !== msg.payload.userId), msg.payload]); break
      case 'USER_LEFT':
        setOnlineUsers(u => u.filter(x => x.userId !== msg.payload.userId)); break
      default: break
    }
  }, [])

  useWebSocket(id, token, handleMessage)

  const onDragStart = (e, task) => {
    dragTask.current = task
    e.dataTransfer.effectAllowed = 'move'
    setTimeout(() => e.target.classList.add(styles.dragging), 0)
  }

  const onDragEnd = (e) => {
    e.target.classList.remove(styles.dragging)
    setDragOver(null)
    dragTask.current = null
  }

  const onDragOver = (e, colId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(colId)
  }

  const onDrop = async (e, colId) => {
    e.preventDefault()
    setDragOver(null)
    const task = dragTask.current
    if (!task || task.status === colId) return
    setTasks(t => t.map(tk => tk.id === task.id ? { ...tk, status: colId } : tk))
    try {
      await api.patch(`/tasks/${task.id}?workspaceId=${id}`, { status: colId })
    } catch {
      setTasks(t => t.map(tk => tk.id === task.id ? { ...tk, status: task.status } : tk))
    }
  }

  const handleCreateTask = async (data) => {
    await api.post(`/tasks?workspaceId=${id}`, data)
    // WebSocket broadcast will add it to state
    setShowNewTask(false)
  }

  const handleUpdateTask = async (taskId, updates) => {
    const res = await api.patch(`/tasks/${taskId}?workspaceId=${id}`, updates)
    setTasks(t => t.map(task => task.id === taskId ? { ...task, ...res.data } : task))
    setSelectedTask(null)
  }

  const handleDeleteTask = async (taskId) => {
    await api.delete(`/tasks/${taskId}?workspaceId=${id}`)
    setTasks(t => t.filter(task => task.id !== taskId))
    setSelectedTask(null)
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post(`/workspaces/${id}/invite`, { email: inviteEmail })
      setInviteMsg(`✅ ${res.message}`)
      setInviteEmail('')
    } catch (err) {
      setInviteMsg(`❌ ${err.message}`)
    }
  }

  const handleLogout = () => { logout(); navigate('/login') }
  const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)
  const tasksByStatus = (status) => tasks.filter(t => t.status === status)

  if (loading) return (
    <div className={styles.loadingPage}>
      <div className={styles.loadingText}>⚡ Loading workspace...</div>
    </div>
  )

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navLeft}>
          <button className={styles.backBtn} onClick={() => navigate('/')}>← Back</button>
          <span className={styles.navLogo}></span>
          <span className={styles.divider}>/</span>
          <span className={styles.wsName}>{workspace?.name}</span>
        </div>
        <div className={styles.navRight}>
          <div className={styles.onlineUsers}>
            {onlineUsers.slice(0,3).map(u => (
              <div key={u.userId} className={styles.onlineAvatar} title={u.fullName}>
                {initials(u.fullName)}
              </div>
            ))}
            {onlineUsers.length > 0 && <span className={styles.onlineDot} />}
          </div>
          <button className={styles.inviteBtn} onClick={() => setShowInvite(true)}>+ Invite</button>
          <div className={styles.avatar} style={{ background: user?.avatarColor }}>
            {initials(user?.fullName)}
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>Sign out</button>
        </div>
      </nav>

      <div className={styles.boardHeader}>
        <div>
          <h1 className={styles.boardTitle}>{workspace?.name}</h1>
          {workspace?.description && <p className={styles.boardDesc}>{workspace.description}</p>}
        </div>
        <button className={styles.newTaskBtn} onClick={() => { setNewTaskCol('TODO'); setShowNewTask(true) }}>
          + New Task
        </button>
      </div>

      <div className={styles.board}>
        {COLUMNS.map(col => (
          <div
            key={col.id}
            className={`${styles.column} ${dragOver === col.id ? styles.dropTarget : ''}`}
            onDragOver={e => onDragOver(e, col.id)}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => onDrop(e, col.id)}
          >
            <div className={styles.colHeader}>
              <div className={styles.colDot} style={{ background: col.color }} />
              <span className={styles.colLabel}>{col.label}</span>
              <span className={styles.colCount}>{tasksByStatus(col.id).length}</span>
              <button className={styles.addBtn} onClick={() => { setNewTaskCol(col.id); setShowNewTask(true) }}>+</button>
            </div>
            <div className={styles.colCards}>
              {tasksByStatus(col.id).map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => setSelectedTask(task)}
                  draggable
                  onDragStart={e => onDragStart(e, task)}
                  onDragEnd={onDragEnd}
                />
              ))}
              {tasksByStatus(col.id).length === 0 && (
                <div className={`${styles.emptyCol} ${dragOver === col.id ? styles.emptyColActive : ''}`}>
                  {dragOver === col.id ? '✦ Drop here' : 'No tasks'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showNewTask && (
        <TaskModal mode="create" defaultStatus={newTaskCol} members={workspace?.members || []}
          onSubmit={handleCreateTask} onClose={() => setShowNewTask(false)} />
      )}

      {selectedTask && (
        <TaskModal mode="edit" task={selectedTask} workspaceId={id} members={workspace?.members || []}
          onSubmit={(data) => handleUpdateTask(selectedTask.id, data)}
          onDelete={() => handleDeleteTask(selectedTask.id)}
          onClose={() => setSelectedTask(null)} />
      )}

      {showInvite && (
        <div className={styles.overlay} onClick={() => { setShowInvite(false); setInviteMsg('') }}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>Invite member</h2>
            <p className={styles.modalSub}>They must already have a Flowspace account</p>
            <form onSubmit={handleInvite}>
              <div className={styles.field}>
                <label>Email address</label>
                <input type="email" value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="teammate@example.com" required />
              </div>
              {inviteMsg && <p className={styles.inviteMsg}>{inviteMsg}</p>}
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn}
                  onClick={() => { setShowInvite(false); setInviteMsg('') }}>Close</button>
                <button type="submit" className={styles.createBtn}>Send invite</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}