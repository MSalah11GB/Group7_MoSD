import React from 'react'
import { assets } from '../assets/assets'

const Navbar = () => {
    return (
        <>
            <div className='w-full flex justify-between items-center font-semibold'>
                <div className='flex items-center gap-2'>
                    <img className='w-8 bg-black p-1.5 rounded-2xl cursor-pointer hover:bg-gray-800 transition-colors' src={assets.arrow_left} alt="" />
                    <img className='w-8 bg-black p-1.5 rounded-2xl cursor-pointer hover:bg-gray-800 transition-colors' src={assets.arrow_right} alt="" />
                </div>
                <div className='flex items-center gap-4 relative'>
                    <p className='bg-white text-black text-[15px] px-4 py-1 rounded-2x1 hidden md:block cursor-pointer'>Explore Premium</p>
                    <p className='bg-black py-1 px-3 rounded-2x1 text-[15px] cursor-pointer'>Install App</p>
                    <p className='bg-purple-500 text-black w-7 h-7 rounded-full flex items-center justify-center'>A</p>
                </div>
                <div className='flex items-center gap-2 mt-4'>
                    <p className='bg-whte text-black px-4 py-1 rounded-2x1 cursor-pointer'>All</p>
                    <p className='bg-black px-4py-1 rounded-2x1 cursor-pointer'>Music</p>
                    <p className='bg-black px-4py-1 rounded-2x1 cursor-pointer'>Podcast</p>
                </div>
            </div>
        </>
    )
}

export default Navbar
