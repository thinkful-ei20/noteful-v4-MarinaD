'use strict';

const express = require('express');
const router = express.Router();
const passport = require('passport');
const mongoose = require('mongoose');

const Note = require('../models/note');
const Folder = require('../models/folder');
const Tag = require('../models/tag');

const validateId = (Model, modelId, userId, next) => {
  Model.findOne({_id : modelId, userId})
    .then(result => {
      if(!result) {
        const err = new Error (`There are no ${Model.collection.name} with this ID`);
        err.status = 400;
        return next(err);
      }
    });
};

//Protect Endpoints with JWT
router.use('/', passport.authenticate('jwt', {session: false,
  failWithError: true}));

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {

  const { searchTerm, folderId, tagId } = req.query;

  let filter = {};

  if (searchTerm) {
    
    filter.$or = [{ 'title': { $regex: searchTerm } }, { 'content': { $regex: searchTerm } }];
  }

  if (folderId) {
    filter.folderId = folderId;
  }

  if (tagId) {
    filter.tags = tagId;
  }

  filter.userId = req.user.id;

  Note.find(filter)
    .populate('tags')
    .sort({ 'updatedAt': 'desc' })
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findOne({_id :id, userId : req.user.id})
    .populate('tags')
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {

  const { title, content, tags = [] } = req.body;
  let {folderId} = req.body;
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  if (folderId === '') folderId = undefined;

  if(folderId){
    validateId(Folder, folderId, userId, next);
  }

  if(tags.length) {
    tags.map(tag => {
      validateId(Tag, tag, userId, next);
    });
  }

  Note.create({ title, content, folderId, tags, userId })
    .then(result => {
      res
        .location(`${req.originalUrl}/${result.id}`)
        .status(201)
        .json(result);
    })
    .catch(err => {
      return next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */
router.put('/:id', (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { title, content, folderId, tags = [] } = req.body;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  if(folderId){
    validateId(Folder, folderId, userId, next);
  }

  if(tags.length) {
    tags.map(tag => {
      validateId(Tag, tag, userId, next);
    });
  }
  
  Note.findOneAndUpdate({_id : id, userId}, { title, content, folderId, tags }, { new: true })
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  Note.findOneAndRemove({_id: id, userId})
    .then(() => {
      res.status(204).end();
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;