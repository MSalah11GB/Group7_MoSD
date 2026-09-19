import { useEffect, useState } from 'react'
import axios from 'axios'
import { SignIn, UserButton, useAuth } from '@clerk/clerk-react'
import { url } from '../config/api'
import { setTokenGetter } from '../config/http'

const Centered = ({ children }) => (
  <div className='min-h-screen flex flex-col items-center justify-center gap-4 bg-[#F3FFF7] text-gray-800'>
    {children}
  </div>
)

// Renders its children only for a signed-in user that the backend confirms is an admin.
const AdminGate = ({ children }) => {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth()
  // The outcome is stored with the user it belongs to, so switching accounts re-checks automatically.
  const [result, setResult] = useState(null)

  useEffect(() => {
    setTokenGetter(getToken)
  }, [getToken])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let cancelled = false

    axios
      .get(`${url}/api/auth/me`)
      .then((res) => !cancelled && setResult({ userId, status: res.data.isAdmin ? 'admin' : 'forbidden' }))
      .catch(() => !cancelled && setResult({ userId, status: 'error' }))

    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, userId])

  if (!isLoaded) return <Centered>Loading...</Centered>

  if (!isSignedIn) {
    return (
      <Centered>
        <p className='text-lg font-medium'>Admin panel - please sign in</p>
        <SignIn routing='hash' />
      </Centered>
    )
  }

  const status = result?.userId === userId ? result.status : 'checking'

  if (status === 'checking') return <Centered>Checking permissions...</Centered>

  if (status === 'forbidden') {
    return (
      <Centered>
        <p className='text-lg font-medium'>Your account does not have admin access.</p>
        <UserButton />
      </Centered>
    )
  }

  if (status === 'error') {
    return (
      <Centered>
        <p className='text-lg font-medium'>Could not reach the server. Is the backend running?</p>
        <UserButton />
      </Centered>
    )
  }

  return children
}

export default AdminGate
