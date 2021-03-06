const blogsRouter = require('express').Router()
const Blog = require('../models/blog')
const User = require('../models/user')
const jwt = require('jsonwebtoken')
const config = require('../utils/config')


blogsRouter.get('/', async (request, response) => {
    const blogs = await Blog.find({})
    .populate('user', {username: 1, name: 1})
    response.json(blogs.map(blog => blog.toJSON()))
})

blogsRouter.post('/', async (request, response) => {
    const body = request.body
    
    if(!body.title || !body.url){
        response.status(400).end()
    }else{
        if (!request.token){
            return response.status(401).json({error: 'token missing or invalid'})
        }
        console.log(request.token)
        const decodedToken = jwt.verify(request.token, config.SECRET)

        if(!decodedToken){
            return response.status(401).json({error: 'token missing or invalid'})
        }
    
        if(!request.token || !decodedToken.id){
            return response.status(401).json({error: 'token missing or invalid'})
        }
    
        const user = await User.findById(decodedToken.id)
        
        const blog = new Blog({
            likes: body.likes,
            title: body.title,
            author: body.author,
            url: body.url,
            user: user._id,
            comments: []
        })
    
        const savedBlog = await blog.save()
        user.blogs = user.blogs.concat(savedBlog._id)
        await user.save()
            
        response.status(201).json(savedBlog)
    }
})

blogsRouter.post('/:id/comments', async (request, response) => {
    const body = request.body
    const blog = await Blog.findById(request.params.id)

    const comment = {
        text: body.text
    }

    blog.comments = blog.comments.concat(comment)
    console.log("added comment", blog)
    const updatedBlog = await Blog.findByIdAndUpdate(request.params.id, blog)

    response.status(201).json(updatedBlog)
})

blogsRouter.delete('/:id', async (request, response) => {
    if (!request.token){
        return response.status(401).json({error: 'token missing or invalid'})
    }

    const decodedToken = jwt.verify(request.token, config.SECRET)
    
    if(!request.token || !decodedToken.id){
        return response.status(401).json({error: 'token missing or invalid'})
    }

    const userId = decodedToken.id

    const blog = await Blog.findById(request.params.id)

    if (userId.toString() === blog.user.toString()){
        await Blog.findByIdAndRemove(request.params.id)

        response.status(204).end()
    }else{
        return response.status(401).json({error: 'this user cannot remove this blog'})
    }

})

blogsRouter.put('/:id', async (request, response) => {
    const body = request.body

    const blog = {
        title: body.title,
        author: body.author,
        url: body.url,
        likes: body.likes,
    }

    const updatedBlog = await Blog.findByIdAndUpdate(request.params.id, blog, { new: true })

    response.status(200).json(updatedBlog.toJSON())
})

module.exports = blogsRouter