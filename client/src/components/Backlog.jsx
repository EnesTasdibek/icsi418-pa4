import { useState, useEffect, useCallback } from 'react'
const API = 'http://localhost:9000'

function ProjectBacklog({ project, users, membersVersion }) {
  const [stories, setStories] = useState([])
  const [members, setMembers] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [assignedId, setAssignedId] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [message, setMessage] = useState('')
  const [selectedStoryId, setSelectedStoryId] = useState('')
  const [editStory, setEditStory] = useState(null)

  function userLabel(id) {
    if (!id) {
      return 'Unassigned'
    }
    const user = users.find(user => user._id === id)
    if (user) {
      return user.username
    } else {
      return 'Unknown user'
    }
  }

  const loadStories = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/projects/${project._id}/stories`)
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.message)
        return
      }
      setStories(data)
    } catch {
      setMessage('Could not reach the server')
    }
  }, [project._id])

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/projects/${project._id}/members`)
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.message)
        return
      }
      setMembers(data)
    } catch {
      setMessage('Could not reach the server')
    }
  }, [project._id])

  useEffect(() => {
    loadStories()
  }, [loadStories])

  useEffect(() => {
    loadMembers()
  }, [loadMembers, membersVersion])

  async function createStory(e) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      setFormMessage('Title and description are required')
      return
    }
    const storyData = {
      title,
      description,
      priority,
      assigned_user_id: assignedId === '' ? null : assignedId
    }
    try {
      const res = await fetch(`${API}/api/projects/${project._id}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storyData),
      })
      const data = await res.json()
      if (!res.ok) {
        setFormMessage(data.message)
        return
      }
      setFormMessage(`Story "${title}" created`)
      setTitle('')
      setDescription('')
      setPriority('Medium')
      setAssignedId('')
      loadStories()
    } catch {
      setFormMessage('Could not reach the server')
    }
  }

  function startEdit(story) {
    setMessage('')
    setEditStory({
      _id: story._id,
      title: story.title,
      description: story.description,
      priority: story.priority,
      status: story.status,
      assigned_user_id: story.assigned_user_id || ''
    })
  }

  async function saveStory(e) {
    e.preventDefault()
    if (!editStory.title.trim() || !editStory.description.trim()) {
      setMessage('Title and description are required')
      return
    }
    const storyData = {
      title: editStory.title,
      description: editStory.description,
      priority: editStory.priority,
      status: editStory.status,
      assigned_user_id: editStory.assigned_user_id === '' ? null : editStory.assigned_user_id
    }
    try {
      const res = await fetch(`${API}/api/projects/${project._id}/stories/${editStory._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storyData),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.message)
        return
      }
      setMessage(`Story "${editStory.title}" saved`)
      setEditStory(null)
      loadStories()
    } catch {
      setMessage('Could not reach the server')
    }
  }

  async function deleteStory(story) {
    if (!window.confirm(`Delete the story "${story.title}"?`)) {
      return
    }
    try {
      const res = await fetch(`${API}/api/projects/${project._id}/stories/${story._id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.message)
        return
      }
      setMessage(`Story "${story.title}" deleted`)
      if (selectedStoryId === story._id) {
        setSelectedStoryId('')
      }
      if (editStory && editStory._id === story._id) {
        setEditStory(null)
      }
      loadStories()
    } catch {
      setMessage('Could not reach the server')
    }
  }

  const selectedStory = stories.find(story => story._id === selectedStoryId)

  return (
    <div className="members-box">
      <h2>{project.name} backlog</h2>

      <h3>New story</h3>
      <form onSubmit={createStory} className="stack">
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="As a [type of user], I want [goal], so that [benefit]."
          />
        </label>
        <label>
          Priority
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </label>
        <label>
          Assigned member
          <select value={assignedId} onChange={(e) => setAssignedId(e.target.value)}>
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m._id} value={m.user_id}>
                {userLabel(m.user_id)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">Create story</button>
      </form>
      <p>{formMessage}</p>

      <h3>Stories</h3>
      {stories.length === 0 && <p>This project has no stories yet.</p>}

      {stories.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned member</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {stories.map((story) => (
                <tr key={story._id}>
                  <td>{story.title}</td>
                  <td>{story.priority}</td>
                  <td>{story.status}</td>
                  <td>{userLabel(story.assigned_user_id)}</td>
                  <td>
                    <button onClick={() => setSelectedStoryId(story._id)}>Details</button>
                    <button onClick={() => startEdit(story)}>Edit</button>
                    <button onClick={() => deleteStory(story)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p>{message}</p>

      {selectedStory && (
        <div>
          <h3>Story details</h3>
          <p><strong>{selectedStory.title}</strong></p>
          <p>{selectedStory.description}</p>
          <button onClick={() => setSelectedStoryId('')}>Close</button>
        </div>
      )}

      {editStory && (
        <div>
          <h3>Edit story</h3>
          <form onSubmit={saveStory} className="stack">
            <label>
              Title
              <input
                value={editStory.title}
                onChange={(e) => setEditStory({ ...editStory, title: e.target.value })}
              />
            </label>
            <label>
              Description
              <textarea
                value={editStory.description}
                onChange={(e) => setEditStory({ ...editStory, description: e.target.value })}
              />
            </label>
            <label>
              Priority
              <select
                value={editStory.priority}
                onChange={(e) => setEditStory({ ...editStory, priority: e.target.value })}
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </label>
            <label>
              Status
              <select
                value={editStory.status}
                onChange={(e) => setEditStory({ ...editStory, status: e.target.value })}
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </label>
            <label>
              Assigned member
              <select
                value={editStory.assigned_user_id}
                onChange={(e) => setEditStory({ ...editStory, assigned_user_id: e.target.value })}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m._id} value={m.user_id}>
                    {userLabel(m.user_id)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit">Save</button>
            <button type="button" onClick={() => setEditStory(null)}>Cancel</button>
          </form>
        </div>
      )}
    </div>
  )
}

export default ProjectBacklog