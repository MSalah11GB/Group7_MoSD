import React, { useState, useEffect } from 'react'
import { assets } from '../assets/assets'
import axios from 'axios';
import { url } from '../App';
import { toast } from 'react-toastify';

const AddGenre = () => {
    // Initialize state from localStorage if available
    //const [image, setImage] = useState(false);
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('addGenre_name', name);
    }, [name]);

    // Clear localStorage after successful submission
    const clearStoredFormData = () => {
        localStorage.removeItem('addGenre_name');
    };

    const onSubmitHandler = async (e) => {
        e.preventDefault();

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('name', name);

            const response = await axios.post(`${url}/api/genre/add`, formData);

            if (response.data.success) {
                toast.success("Genre Added");
                setName("");
                
                // Clear localStorage after successful submission
                clearStoredFormData();
            } else {
                toast.error("Something went wrong");
            }
        } catch (error) {
            console.log(error);
            toast.error("Error occurred");
        }
        setLoading(false);
    }

    return loading ? (
        <div className='grid place-items-center min-h-[80vh]'>
            <div className='w-16 h-16 place-self-center border-4 border-gray-400 border-t-green-800 rounded-full animate-spin'>
            </div>
        </div>
    ) : (
        <form onSubmit={onSubmitHandler} className='flex flex-col items-start gap-8 text-gray-600' action="">
            <div className='flex flex-col gap-2.5'>
                <p>Genre name</p>
                <input onChange={(e) => setName(e.target.value)} value={name} className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[max(40vw,250vw)]' placeholder='Type Here' type="text" required/>
            </div>
            <button type="submit" className='text-base bg-black text-white py-2.5 px-14 cursor-pointer'>ADD</button>
        </form>
    )
}

export default AddGenre