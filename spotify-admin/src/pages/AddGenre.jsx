import React, { useState } from 'react'
import { assets } from '../assets/assets'
import axios from 'axios';
import { url } from '../App';
import { toast } from 'react-toastify';

const AddGenre = () => {

  const [image, setImage] = useState(false);
  const [name, setName] = useState("");

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    if (!image) {
      toast.error("Please upload an image");
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('image', image);

      const response = await axios.post(`${url}/api/genre/add`, formData);

      if (response.data.success) {
        toast.success("Genre Added");
        setName("");
        setImage(false);
      } else {
        toast.error("Something went wrong");
      }

    } catch (error) {
      console.log(error);
      toast.error("Error occurred");
    }
  }

  return (
    <form onSubmit={onSubmitHandler} className='flex flex-col items-start gap-8 text-gray-600'>
      <div className='flex flex-col gap-4'>
        <p>Upload Image</p>
        <input
          onChange={(e) => setImage(e.target.files[0])}
          type="file"
          id='image'
          accept='image/*'
          hidden
        />
        <label htmlFor="image">
          <img
            src={image ? URL.createObjectURL(image) : assets.upload_area}
            className='w-24 cursor-pointer'
            alt=""
          />
        </label>
      </div>

      <div className='flex flex-col gap-2.5'>
        <p>Genre name</p>
        <input
          onChange={(e) => setName(e.target.value)}
          value={name}
          className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[max(40vw,250vw)]'
          placeholder='Type Here'
          type="text"
          required
        />
      </div>

      <button
        type="submit"
        className='text-base bg-black text-white py-2.5 px-14 cursor-pointer'
      >
        ADD
      </button>
    </form>
  )
}

export default AddGenre
