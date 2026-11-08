import { useState, useEffect, useCallback } from 'react'
const API = 'http://localhost:9000'

function ProjectMembers({ project, users, onMembersChanged }) {
  const [members, setMembers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [message, setMessage] = useState('')

  function userLabel(users, id) {
    const user = users.find(user => user._id === id)
    if (user) {
      return user.username
    } else {
      return 'Unknown user'
    }
  }

  //Retrieve project memberships
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
    loadMembers()
  }, [loadMembers])

  //Add a member
  async function addMember() {
    try {
      const res = await fetch(`${API}/api/projects/${project._id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selectedUserId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.message)
        return
      }
      setMessage(`${userLabel(users, selectedUserId)} added`)
      onMembersChanged()
      setSelectedUserId('')
      loadMembers()
    } catch {
      setMessage('Could not reach the server')
    }
  }

  //Remove a non-lead member
  async function removeMember(userId) {
    try {
      const res = await fetch(`${API}/api/projects/${project._id}/members/${userId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.message)
        return
      }
      setMessage(`${userLabel(users, userId)} removed`)
      onMembersChanged()
      loadMembers()
    } catch {
      setMessage('Could not reach the server')
    }
  }

  return (
    <div className="members-box">
      <h2>{project.name} members</h2>

      {/* Display project members */}
      <ul className="members">
        {members.map((m) => {
          const isLead = m.user_id === project.project_lead_id
          return (
            <li key={m._id}>
              <span>
                {userLabel(users, m.user_id)}
                {isLead && <strong> (Project lead)</strong>}
              </span>
              {!isLead && <button onClick={() => removeMember(m.user_id)}>Remove</button>}
            </li>
          )
        })}
      </ul>

      <div className="row">
        {/* All users are listed */}
        <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
          <option value="">Select a user</option>
          {users.map((user) => (
            <option key={user._id} value={user._id}>
              {user.username}
            </option>
          ))}
        </select>
        <button onClick={addMember} disabled={!selectedUserId}>Add member</button>
      </div>

      <p>{message}</p>
    </div>
  )
}

export default ProjectMembers