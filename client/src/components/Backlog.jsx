import { useState, useEffect } from 'react'
import axios from 'axios'

function Backlog({ project, users, membersVersion }) {
  const url = `http://localhost:9000/api/projects/${project._id}`

  const [stories, setStories] = useState([])
  const [members, setMembers] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [assignedId, setAssignedId] = useState('')
  const [message, setMessage] = useState('')
  const [selectedStoryId, setSelectedStoryId] = useState('')
  const [editStory, setEditStory] = useState(null)

  const userLabel = (id) => {
    if (!id) {
      return 'Unassigned'
    }
    const user = users.find(user => user._id === id)
    if (user) {
      return user.username
    }
    return 'Unknown user'
  }

  const showError = (err) => {
    if (err.response) {
      setMessage(err.response.data.message)
    } else {
      setMessage('Could not reach the server')
    }
  }

  const loadStories = () => {
    axios.get(`${url}/stories`)
      .then((res) => setStories(res.data))
      .catch(showError)
  }

  const loadMembers = () => {
    axios.get(`${url}/members`)
      .then((res) => setMembers(res.data))
      .catch(showError)
  }

  useEffect(() => {
    loadStories()
  }, [])

  useEffect(() => {
    loadMembers()
  }, [membersVersion])

  const createStory = (e) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      setMessage('Title and description are required')
      return
    }
    axios.post(`${url}/stories`, {
      title: title,
      description: description,
      priority: priority,
      assigned_user_id: assignedId || null
    })
      .then(() => {
        setMessage(`Story "${title}" created`)
        setTitle('')
        setDescription('')
        setPriority('Medium')
        setAssignedId('')
        loadStories()
      })
      .catch(showError)
  }

  const saveStory = (e) => {
    e.preventDefault()
    if (!editStory.title.trim() || !editStory.description.trim()) {
      setMessage('Title and description are required')
      return
    }
    axios.put(`${url}/stories/${editStory._id}`, {
      title: editStory.title,
      description: editStory.description,
      priority: editStory.priority,
      status: editStory.status,
      assigned_user_id: editStory.assigned_user_id || null
    })
      .then(() => {
        setMessage(`Story "${editStory.title}" saved`)
        setEditStory(null)
        loadStories()
      })
      .catch(showError)
  }

  const deleteStory = (story) => {
    if (!window.confirm(`Delete the story "${story.title}"?`)) {
      return
    }
    axios.delete(`${url}/stories/${story._id}`)
      .then(() => {
        setMessage(`Story "${story.title}" deleted`)
        setSelectedStoryId('')
        setEditStory(null)
        loadStories()
      })
      .catch(showError)
  }

  const selectedStory = stories.find(story => story._id === selectedStoryId)

  return (
    <div className="members-box">
      <h2>{project.name} backlog</h2>

      <h3>New story</h3>
      <form onSubmit={createStory} className="stack">
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea
          placeholder="As a [type of user], I want [goal], so that [benefit]."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <select value={assignedId} onChange={(e) => setAssignedId(e.target.value)}>
          <option value="">Unassigned</option>
          {members.map((m) => (
            <option key={m._id} value={m.user_id}>{userLabel(m.user_id)}</option>
          ))}
        </select>
        <button type="submit">Create story</button>
      </form>

      <p>{message}</p>

      <h3>Stories</h3>
      {stories.length === 0 && <p>This project has no stories yet.</p>}
      {stories.length > 0 && (
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
                  <button onClick={() => setEditStory({ ...story, assigned_user_id: story.assigned_user_id || '' })}>Edit</button>
                  <button onClick={() => deleteStory(story)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedStory && (
        <div>
          <h3>{selectedStory.title}</h3>
          <p>{selectedStory.description}</p>
          <button onClick={() => setSelectedStoryId('')}>Close</button>
        </div>
      )}

      {editStory && (
        <form onSubmit={saveStory} className="stack">
          <h3>Edit story</h3>
          <input
            value={editStory.title}
            onChange={(e) => setEditStory({ ...editStory, title: e.target.value })}
          />
          <textarea
            value={editStory.description}
            onChange={(e) => setEditStory({ ...editStory, description: e.target.value })}
          />
          <select
            value={editStory.priority}
            onChange={(e) => setEditStory({ ...editStory, priority: e.target.value })}
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select
            value={editStory.status}
            onChange={(e) => setEditStory({ ...editStory, status: e.target.value })}
          >
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>
          <select
            value={editStory.assigned_user_id}
            onChange={(e) => setEditStory({ ...editStory, assigned_user_id: e.target.value })}
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m._id} value={m.user_id}>{userLabel(m.user_id)}</option>
            ))}
          </select>
          <button type="submit">Save</button>
          <button type="button" onClick={() => setEditStory(null)}>Cancel</button>
        </form>
      )}
    </div>
  )
}

export default Backlog