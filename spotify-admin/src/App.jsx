import React from 'react'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Routes, Route} from 'react-router-dom';
import AddSong from './pages/AddSong';
import AddAlbum from './pages/AddAlbum';
import AddArtist from './pages/AddArtist';
import AddGenre from './pages/AddGenre';
import EditAlbum from './pages/EditAlbum';
import EditArtist from './pages/EditArtist';
import ListSong from './pages/ListSong';
import ListAlbum from './pages/ListAlbum';
import ListArtist from './pages/ListArtist';
import ListGenre from './pages/ListGenre';
import EditSong from './pages/EditSong';
import EditGenre from './pages/EditGenre';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

export const url = 'http://localhost:4000'

const App = () => {
  return (
    <div className='flex items-start min-h-screen'>
      <ToastContainer/>
      <Sidebar/>
      <div className='flex-1 h-screen overflow-y-auto bg-[#F3FFF7]'>
        <Navbar/>
        <div className='pt-8 pl-5 sm:pt-12 sm:pl-12'>
          <Routes>
            <Route path='/add-song' element={<AddSong/>} />
            <Route path='/add-album' element={<AddAlbum/>} />
            <Route path='/add-artist' element={<AddArtist/>} />
            <Route path='/add-genre' element={<AddGenre/>} />

             <Route path="/list-song" element={<ListSong />} />
            <Route path="/list-album" element={<ListAlbum />} />
            <Route path="/list-artist" element={<ListArtist />} />
            <Route path="/list-genre" element={<ListGenre />} />

            <Route path="/edit-song/:id" element={<EditSong />} />
            <Route path="/edit-album/:id" element={<EditAlbum />} />
            <Route path="/edit-artist/:id" element={<EditArtist />} />
            <Route path="/edit-genre/:id" element={<EditGenre />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default App
