// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const { randomBytes } = require('crypto');
const axios = require('axios');

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Comments
const commentsByPostId = {};

// Routes
// /posts/:id/comments
app.get('/posts/:id/comments', (req, res) => {
  // Send back comments for a particular post id
  res.send(commentsByPostId[req.params.id] || []);
});

app.post('/posts/:id/comments', async (req, res) => {
  // Create a new comment
  const commentId = randomBytes(4).toString('hex');
  const { content } = req.body;

  // Get the comments for the post
  const comments = commentsByPostId[req.params.id] || [];

  // Add the new comment to the comments array
  comments.push({ id: commentId, content, status: 'pending' });

  // Set the comments for the post
  commentsByPostId[req.params.id] = comments;

  // Emit a comment created event
  await axios.post('http://localhost:4005/events', {
    type: 'CommentCreated',
    data: { id: commentId, content, postId: req.params.id, status: 'pending' },
  });

  // Send back the comments
  res.status(201).send(comments);
});

app.post('/events', async (req, res) => {
  // Handle event from event bus
  console.log('Event Received: ', req.body.type);

  const { type, data } = req.body;

  // Check if the event type is comment moderated
  if (type === 'CommentModerated') {
    // Get the comments for the post
    const comments = commentsByPostId[data.postId];

    // Find the comment with the id
    const comment = comments.find((comment) => {
      return comment.id === data.id;
    });

    // Update the comment with the status
    comment.status = data.status;

    // Emit a comment updated event
    await axios.post('http://localhost:4005/events', {
      type: 'CommentUpdated',
      data: { id: data.id, content: data.content, postId: data.postId, status: data.status },
    });