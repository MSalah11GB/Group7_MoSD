import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import playlistModel from '../models/playlistModel.js';
import songModel from '../models/songModel.js';
import { User } from '../models/userModel.js';

// Create a new playlist
const createPlaylist = async (req, res) => {
};

// Get all playlists (with optional filtering)
const listPlaylists = async (req, res) => {

};

// Get a single playlist by ID
const getPlaylist = async (req, res) => {

};

// Update a playlist
const updatePlaylist = async (req, res) => {

};

// Delete a playlist
const deletePlaylist = async (req, res) => {

};

// Add a song to a playlist
const addSongToPlaylist = async (req, res) => {

};

// Remove a song from a playlist
const removeSongFromPlaylist = async (req, res) => {

};

// Reorder songs in a playlist
const reorderSongs = async (req, res) => {

};

export {
  createPlaylist,
  listPlaylists,
  getPlaylist,
  updatePlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  reorderSongs
};
