import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { url } from '../App';
import { toast } from 'react-toastify';

const EditGenre = () => {
    const { id } = useParams(); // Get genre ID from URL
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [color, setColor] = useState('#000000');
    const [loading, setLoading] = useState(false);

    // Fetch genre data on mount
    useEffect(() => {
        const fetchGenre = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${url}/api/genre/list`, { params: { id } });
            if (response.data.success && response.data.genres.length > 0) {
            const genre = response.data.genres[0];
            setName(genre.name);
            setColor(genre.bgColor || '#000000'); // fallback color
            } else {
            toast.error("Genre not found");
            navigate('/list-genre');
            }
        } catch (error) {
            console.error("Error fetching genre data:", error);
            toast.error("Error occurred while fetching genre data");
            navigate('/list-genre');
        }
        setLoading(false);
        };

        fetchGenre();
    }, [id, navigate]);

    const onSubmitHandler = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
        toast.error("Genre name cannot be empty");
        return;
        }

        setLoading(true);
        try {
        const response = await axios.post(`${url}/api/genre/update`, {
            id,
            name: name.trim(),
            bgColor: color
        });

        if (response.data.success) {
            toast.success("Genre updated successfully");
            navigate('/list-genre');
        } else {
            if (response.data.isDuplicate) {
            toast.error("A genre with this name already exists");
            } else {
            toast.error(response.data.message || "Failed to update genre");
            }
        }
        } catch (error) {
        console.error("Error updating genre:", error);
        toast.error("Error occurred while updating genre");
        }
        setLoading(false);
    };

    return loading ? (
        <div className='grid place-items-center min-h-[80vh]'>
        <div className='w-16 h-16 place-self-center border-4 border-gray-400 border-t-green-800 rounded-full animate-spin'></div>
        </div>
    ) : (
        <div>
        <h2 className="text-xl font-bold mb-6">Edit Genre</h2>
        <form onSubmit={onSubmitHandler} className='flex flex-col items-start gap-6 text-gray-600'>
            <div className='flex flex-col gap-2.5'>
            <p>Genre Name</p>
            <input
                type="text"
                placeholder='Type here'
                value={name}
                onChange={(e) => setName(e.target.value)}
                className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[max(40vw,250px)]'
            />
            </div>

            <div className='flex flex-col gap-2.5'>
            <p>Theme Color</p>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </div>

            <div className="flex gap-4">
            <button type='submit' className='text-base bg-black text-white py-2.5 px-14 cursor-pointer'>UPDATE</button>
            <button
                type='button'
                onClick={() => navigate('/list-genre')}
                className='text-base bg-gray-500 text-white py-2.5 px-14 cursor-pointer'
            >
                CANCEL
            </button>
            </div>
        </form>
        </div>
    );
};

export default EditGenre;
