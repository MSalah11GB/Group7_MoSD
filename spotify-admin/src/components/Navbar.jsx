import React from 'react'
import { UserButton } from '@clerk/clerk-react'

const Navbar = () => {
  return (
    <div className='navbar w-full border-b-2 border-gray-800 px-5 sm:px-12 py-4 text-lg flex items-center justify-between'>
        <p>Admin panel</p>
        <UserButton />
    </div>
  )
}

export default Navbar
