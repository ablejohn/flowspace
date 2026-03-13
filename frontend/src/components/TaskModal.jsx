import { useState, useEffect } from 'react'
import api from '../lib/api'
import styles from './TaskModal.module.css'

const STATUSES   = ['TODO','IN_PROGRESS','IN_REVIEW','DONE']
const PRIORITIES = ['LOW','MEDIUM','HIGH','URGENT']

const STATUS_LABEL = {
  TODO: 'To Do', IN_PROGRESS: 'In Progress', IN_REVIEW: 'In Review', DONE: 'Done'
}

export default function TaskModal({ mode, task, workspaceId, defaultStatus, members, onSubmit, onDelete, onClose }) {
  const [form, setForm] = useState({
    title:       task?.title       || '',
    description: task?.description || '',
    status:      task?.status      || defaultStatus || 'TODO',
    priority:    task?.priority    || 'MEDIUM',
    assigneeId:  task?.assignee_id || '',
    dueDate:     task?.due_date ? task.due_date.slice(0,10) : '',
  })

  const [comments, setComments]   = useState([])
  const [newComment, setNewComment] = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [tab, setTab]             = useState('details') // details | comments

  useEffect(() => {
    if (mode === 'edit' && task && workspaceId) {
      api.get(`/tasks/${task.id}/comments?workspaceId=${workspaceId}`)
        .then(res => setComments(res.data))
        .catch(() => {})
    }
  }, [mode, task, workspaceId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSubmit({
        ...form,
        assigneeId: form.assigneeId || undefined,
        dueDate:    form.dueDate    || undefined,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save task')
    } finally {
      setSaving(false)
    }
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    const res = await api.post(`/tasks/${task.id}/comments?workspaceId=${workspaceId}`, { content: newComment })
    setComments(c => [...c, res.data])
    setNewComment('')
  }

  const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{mode === 'create' ? 'New Task' : 'Edit Task'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {mode === 'edit' && (
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab === 'details'  ? styles.activeTab : ''}`} onClick={() => setTab('details')}>Details</button>
            <button className={`${styles.tab} ${tab === 'comments' ? styles.activeTab : ''}`} onClick={() => setTab('comments')}>
              Comments {comments.length > 0 && <span className={styles.commentCount}>{comments.length}</span>}
            </button>
          </div>
        )}

        {tab === 'details' && (
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && <div className={styles.error}>{error}</div>}
            <div className={styles.field}>
              <label>Title *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="What needs to be done?"
                required
              />
            </div>

            <div className={styles.field}>
              <label>Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Add more context..."
                rows={3}
              />
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label>Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label>Assignee</label>
                <select value={form.assigneeId} onChange={e => setForm(f => ({ ...f, assigneeId: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {members?.map(m => (
                    <option key={m.userId} value={m.userId}>{m.fullName}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label>Due date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>

            <div className={styles.actions}>
              {mode === 'edit' && onDelete && (
                <button type="button" className={styles.deleteBtn} onClick={onDelete}>
                  Delete task
                </button>
              )}
              <button type="submit" className={styles.saveBtn} disabled={saving}>
                {saving ? 'Saving...' : mode === 'create' ? 'Create task' : 'Save changes'}
              </button>
            </div>
          </form>
        )}

        {tab === 'comments' && (
          <div className={styles.comments}>
            <div className={styles.commentList}>
              {comments.length === 0 && (
                <p className={styles.noComments}>No comments yet — start the conversation</p>
              )}
              {comments.map(c => (
                <div key={c.id} className={styles.comment}>
                  <div
                    className={styles.commentAvatar}
                    style={{ background: c.author_color || '#6366f1' }}
                  >
                    {initials(c.author_name)}
                  </div>
                  <div>
                    <div className={styles.commentMeta}>
                      <span className={styles.commentAuthor}>{c.author_name}</span>
                      <span className={styles.commentTime}>
                        {new Date(c.created_at).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}
                      </span>
                    </div>
                    <p className={styles.commentText}>{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleComment} className={styles.commentForm}>
              <input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment..."
              />
              <button type="submit">Send</button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}