import styles from './TaskCard.module.css'

const PRIORITY_COLOR = {
  LOW:    '#64748b',
  MEDIUM: '#6366f1',
  HIGH:   '#f59e0b',
  URGENT: '#f87171',
}

export default function TaskCard({ task, onClick, draggable, onDragStart, onDragEnd }) {
  const initials = (name) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2)

  return (
    <div
      className={styles.card}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className={styles.priority} style={{ background: PRIORITY_COLOR[task.priority] }} />
      <div className={styles.body}>
        <p className={styles.title}>{task.title}</p>
        {task.description && (
          <p className={styles.desc}>{task.description.slice(0, 80)}{task.description.length > 80 ? '…' : ''}</p>
        )}
        <div className={styles.footer}>
          <span className={styles.priorityBadge} style={{ color: PRIORITY_COLOR[task.priority] }}>
            {task.priority}
          </span>
          {task.due_date && (
            <span className={styles.due}>
              📅 {new Date(task.due_date).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
            </span>
          )}
          {task.assignee_name && (
            <div className={styles.assignee} style={{ background: task.assignee_color || '#6366f1' }} title={task.assignee_name}>
              {initials(task.assignee_name)}
            </div>
          )}
        </div>
      </div>
      <div className={styles.dragHandle} title="Drag to move">⠿</div>
    </div>
  )
}