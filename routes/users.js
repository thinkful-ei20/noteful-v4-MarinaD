'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const User = require('../models/user');

router.post('/', function(req,res,next){
  const {username, password, fullname} = req.body;
  
  const requiredFields = ['username', 'password'];
  const missingField = requiredFields.find(field => !(field in req.body));

  if(missingField) {
    const err = new Error(`Missing '${missingField}' in request body`);
    err.status = 422;
    return next(err);
  }
  
  const nonStringField = requiredFields.find(field => (!(typeof req.body[field] === 'string' 
  && req.body[field] !== '')));
 

  if (nonStringField) {
    const err = new Error(`'${nonStringField}' is not a non-empty string`);
    err.status = 422;
    return next(err);
  }

  const nonTrimmedField = requiredFields.find(field => (req.body[field] !== req.body[field].trim()));

  if (nonTrimmedField) {
    const err = new Error (`Invalid '${nonTrimmedField}', remove beginning or ending whitespace`);
    err.status = 422;
    return next(err);
  }

  if (password.length < 8){
    const err = new Error('Invalid password - must be at least 8 characters long');
    err.status = 422;
    return next(err);
  }

  if (password.length >72){
    const err = new Error('Invalid password- must be less than 72 characters');
    err.status = 422;
    return next(err);
  }

  User.findOne({username}).
    then(res => {
      if (res) {
        const err = new Error('Username already exists');
        err.status = 422;
        return next(err);
      }
    });

  return User.hashPassword(password)
    .then(digest => {
      const newUser = {
        username: username,
        password: digest,
        fullname : fullname.trim()};
      return User.create(newUser);   
    }) 
    .then(result => {
      if(result) res.status(201).location(`${req.originalUrl}/${result.id}`).json(result);
      
      else return next();
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;