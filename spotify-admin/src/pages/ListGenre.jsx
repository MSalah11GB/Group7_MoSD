import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { url } from '../config/api';
import { toast } from 'react-toastify';
import { useCatalogList } from '../hooks/useCatalog';
import { errorMessage } from '../utils/errors';
import { FaSearch, FaTrash, FaEdit } from 'react-icons/fa';

const ListGenre = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data } = useCatalogList('genre');

    // The genre list is small, so it is filtered as you type instead of on submit.
    const handleSearch = (e) => {
        e.preventDefault();
    };

    const removeGenre = async (id) => {
        const genre = data.find(g => g._id === id);

        if (!window.confirm(`Are you sure you want to remove the genre "${genre.name}"? This will remove the genre from all songs but will not delete any songs.`)) {
            return;
        }

        try {
            const response = await axios.post(`${url}/api/genre/remove`, { id });

            if (response.data.success) {
                toast.success(response.data.message);
                await queryClient.invalidateQueries({ queryKey: ['genre'] });
            } else {
                toast.error('Failed to remove genre');
            }
        } catch (error) {
            toast.error(errorMessage(error));
        }
    };

    const filteredData = data.filter(genre =>
        genre.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
        <div className="mb-5">
            <h1 className='text-3xl font-bold'>List of Genres</h1>
            <p className="text-sm text-gray-600 mt-1">Total: {data.length} genres</p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className='flex items-center gap-2 mb-5'>
            <div className='relative flex-1'>
            <input
                type="text"
                placeholder='Search by genre name'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='w-full p-2 border border-gray-300 rounded'
            />
            </div>
            <button type='submit' className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'>
            Search
            </button>
        </form>

        {/* Table header */}
        <div className='sm:grid hidden grid-cols-[2fr_1fr_1fr_0.5fr_0.5fr] items-center gap-2.5 p-3 border border-gray-300 text-sm mr-5 bg-gray-100'>
            <b>Name</b>
            <b>Songs Count</b>
            <b>Color</b>
            <b>Edit</b>
            <b>Delete</b>
        </div>

        {/* Table rows */}
        {filteredData.map((item, index) => (
            <div key={index} className='grid grid-cols-[1fr_1fr_1fr] sm:grid-cols-[2fr_1fr_1fr_0.5fr_0.5fr] items-center gap-2.5 p-3 border border-gray-300 text-sm mr-5'>
            <p>{item.name}</p>
            <p>{item.songCount || 0}</p>
            <input
                type="color"
                value={item.bgColor || '#000000'}
                readOnly
                className="w-10 h-6 cursor-default border-none bg-transparent"
            />
            <button
                onClick={() => navigate(`/edit-genre/${item._id}`)}
                className='bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600'
            >
                <FaEdit size={14}/><span>Edit</span>
            </button>
            <button
                onClick={() => removeGenre(item._id)}
                className='bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600'
            >
                <FaTrash size={14} />
                <span>Delete</span>
            </button>
            </div>
        ))}

        {/* No genres message */}
        {filteredData.length === 0 && (
            <div className="text-center p-5 bg-gray-100 rounded mt-5">
            <p>No genres found</p>
            </div>
        )}
        </div>
    );
};

export default ListGenre;
