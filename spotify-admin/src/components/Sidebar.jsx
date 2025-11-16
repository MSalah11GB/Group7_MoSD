import React from 'react'
import { assets } from '../assets/assets'
import { NavLink } from 'react-router-dom'

const menuItems = [
  { to: '/add-song', label: 'Add Song', icon: assets.add_song },
  { to: '/list-song', label: 'List Song', icon: assets.song_icon },

  { to: '/add-album', label: 'Add Album', icon: assets.add_album },
  { to: '/list-album', label: 'List Album', icon: assets.album_icon },

  { to: '/add-artist', label: 'Add Artist', icon: assets.add_artist },
  { to: '/list-artist', label: 'List Artist', icon: assets.artist_icon },

  { to: '/add-genre', label: 'Add Genre', icon: assets.genre_icon },
  { to: '/list-genre', label: 'List Genre', icon: assets.genre_icon },
]

const SideBar = () => {
  return (
    <div className="bg-[#003A10] min-h-screen pl-[4vw]">
      {/* LOGO */}
      <img
        src={assets.logo}
        className="mt-5 w-[max(10vw,100px)] hidden sm:block"
        alt="logo"
      />
      <img
        src={assets.logo_small}
        className="mt-5 w-[max(5vw,40px)] mr-5 sm:hidden block"
        alt="logo small"
      />

      {/* MENU */}
      <div className="flex flex-col gap-5 mt-10">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex items-center gap-2.5 text-gray-800 bg-white border border-black p-2 pr-[max(8vw,10px)] drop-shadow-[-4px_4px_#00FF5B] text-sm font-medium"
          >
            <img src={item.icon} className="w-5" alt="" />
            <p className="hidden sm:block">{item.label}</p>
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export default SideBar
