const Sequelize = require('sequelize');
const dbconfig = require('../config/database');
const connection = new Sequelize(dbconfig);
const User = require('../models/User');
const Image = require('../models/Image');
const Gender = require('../models/Gender');
const Course = require('../models/Course');
const UserCourse = require('../models/UserCourse');
const Thumbnail = require('../models/Thumbnail');
const Section = require('../models/Section');
const Video = require('../models/Video');
const UserVideo = require('../models/UserVideo');
User.init(connection);
Course.init(connection);
UserCourse.init(connection);
Image.init(connection);
Gender.init(connection);
Thumbnail.init(connection);
Section.init(connection);
Video.init(connection);
UserVideo.init(connection);
User.associate(connection.models);
Course.associate(connection.models);
Image.associate(connection.models);
Gender.associate(connection.models);
Thumbnail.associate(connection.models);
Section.associate(connection.models);
Video.associate(connection.models);
module.exports = connection;