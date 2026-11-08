import { useState, useEffect } from 'react'
import axios from 'axios'
import CreateProject from './CreateProject'
import ProjectList from './ProjectList'
import ProjectMembers from './ProjectMembers'
import Backlog from './Backlog'

function Projects() {
  //List of registered users (used for Project Lead and member dropdowns)
  const [users, setUsers] = useState([])
  //List of projects stored in MongoDB
  const [projects, setProjects] = useState([])
  //_id of the project whose members are being managed
  const [selectedProjectId, setSelectedProjectId] = useState('')
  //Error message shown on the page
  const [error, setError] = useState('')
  const [membersVersion, setMembersVersion] = useState(0)

  //Fetch the registered users from the backend
  const loadUsers = () => {
    axios.get('http://localhost:9000/api/users')
      .then((res) => {
        setUsers(res.data)
      })
      .catch((err) => {
        setError('Could not load users')
      })
  }

  //Fetch the projects from the backend
  const loadProjects = () => {
    axios.get('http://localhost:9000/api/projects')
      .then((res) => {
        setProjects(res.data)
      })
      .catch((err) => {
        setError('Could not load projects')
      })
  }

  //Load all once when this component first appears
  useEffect(() => {
    loadUsers()
    loadProjects()
  }, [])

  let selectedProject = null
  for (let i = 0; i < projects.length; i++) {
    if (projects[i]._id === selectedProjectId) {
      selectedProject = projects[i]
    }
  }

  return (
    <div>
      {/* Show error message if loading failed */}
      {error && <p className="error">{error}</p>}

      {/* Create Project form; reloads the project list after a project is created */}
      <CreateProject users={users} onCreated={loadProjects} />

      {/* Project list; clicking "Display project members" sets the selected project */}
      <ProjectList
        projects={projects}
        users={users}
        onSelect={setSelectedProjectId}
      />

      {/* key makes React start fresh when a different project is selected */}
      {selectedProject && (
        <ProjectMembers
          key={selectedProject._id}
          project={selectedProject}
          users={users}
          onMembersChanged={() => setMembersVersion(membersVersion + 1)}
        />
      )}

      {selectedProject && (
        <Backlog
          key={selectedProject._id}
          project={selectedProject}
          users={users}
          membersVersion={membersVersion}
        />
      )}
    </div>
  )
}

export default Projects