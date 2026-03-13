import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import api from '../lib/api'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const navigate  = useNavigate()
  const user      = useAuthStore(s => s.user)
  const logout    = useAuthStore(s => s.logout)

  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading]       = useState(true)
  const [showModal, setShowModal]   = useState(false)
  const [form, setForm]             = useState({ name: '', description: '' })
  const [creating, setCreating]     = useState(false)

  useEffect(() => {
    api.get('/workspaces').then(res => {
      setWorkspaces(res.data)
      setLoading(false)
    })
  }, [])

  const createWorkspace = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await api.post('/workspaces', form)
      setWorkspaces(w => [res.data, ...w])
      setShowModal(false)
      setForm({ name: '', description: '' })
    } finally {
      setCreating(false)
    }
  }

  const handleLogout = () => { logout(); navigate('/login') }

  const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navLogo}>FlowSpace</div>
        <div className={styles.navRight}>
          <div className={styles.avatar} style={{ background: user?.avatarColor }}>
            {initials(user?.fullName)}
          </div>
          <span className={styles.userName}>{user?.fullName}</span>
          <button className={styles.logoutBtn} onClick={handleLogout}>Sign out</button>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>My Workspaces</h1>
            <p className={styles.sub}>{workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''}</p>
          </div>
          <button className={styles.newBtn} onClick={() => setShowModal(true)}>
            + New Workspace
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>Loading workspaces...</div>
        ) : workspaces.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🚀</div>
            <h3>No workspaces yet</h3>
            <p>Create your first workspace to start collaborating</p>
            <button className={styles.newBtn} onClick={() => setShowModal(true)}>
              Create workspace
            </button>
          </div>
        ) : (
          <div className={styles.grid}>
            {workspaces.map(w => (
              <div key={w.id} className={styles.card} onClick={() => navigate(`/workspace/${w.id}`)}>
                <div className={styles.cardIcon}>
                  {w.name.slice(0,2).toUpperCase()}
                </div>
                <div className={styles.cardBody}>
                  <h3 className={styles.cardName}>{w.name}</h3>
                  {w.description && <p className={styles.cardDesc}>{w.description}</p>}
                  <div className={styles.cardMeta}>
                    <span>👥 {w.member_count} member{w.member_count !== '1' ? 's' : ''}</span>
                    <span>📋 {w.task_count} tasks</span>
                  </div>
                </div>
                <div className={styles.cardArrow}>→</div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2>New Workspace</h2>
            <form onSubmit={createWorkspace}>
              <div className={styles.field}>
                <label>Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Product Team"
                  required
                />
              </div>
              <div className={styles.field}>
                <label>Description (optional)</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="What does this workspace do?"
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className={styles.createBtn} disabled={creating}>
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
