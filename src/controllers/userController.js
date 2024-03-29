const User = require('../models/User');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const Image = require('../models/Image');
const Gender = require('../models/Gender');
const UserVideo = require('../models/UserVideo');
const UserCourse = require('../models/UserCourse');
const Course = require('../models/Course');
const Video = require('../models/Video');

module.exports = {
    index: async (req, res) => {
        res.json(await User.findAll({ include: ['Images', 'Genres'] }));
    },
    show: async (req, res) => {
        const { id } = req.headers;
        res.json(await User.findByPk(id, { include: ['Images', 'Genres'] }));
    },
    create: async (req, res) => {
        const { name, birthDate, email, password, abbreviation, customName = null, treatment = null } = req.body;
        try{
            const user = await User.create({ name, birthDate, email, password });
            const filePath = req.file ? req.file.path : 'public/default-profile.png';
            await user.createImage({ path: filePath });
            await user.createGenre({ abbreviation, customName, treatment });
            res.json(await User.findByPk(user.id, { include: ['Images', 'Genres'] }));
        }
        catch(err){
            if(req.file) fs.unlinkSync(req.file.path);
            switch(err.name){
                case 'SequelizeValidationError':
                    return res.status(406).json({
                        err: 'A requisição não contém todos os dados necessários'
                    });
                case 'SequelizeUniqueConstraintError':
                    return res.status(406).json({
                        err: 'E-mail já cadastrado'
                    });
            }
        }
    },
    update: async (req, res) => {
        const { id } = req.headers;
        const { name, birthDate, email, removeImage = null } = req.body;
        const user = await User.findByPk(id, {include:'Images'});
        const image = await Image.findByPk(user.Images[0].id);
        user.name = name;
        user.birthDate = birthDate;
        user.email = email;
        try{
            await user.save();
            if(req.file){
                image.path !== 'public/default-profile.png' && fs.unlinkSync(image.path);
                image.path = req.file.path;
                await image.save();
            }
            if(removeImage){
                image.path != 'public/default-profile.png' && fs.unlinkSync(image.path);
                image.path = 'public/default-profile.png';
                await image.save();
            }
            res.json(await User.findByPk(id, { include: 'Images' }));
        }
        catch(err){
            console.log(err);
        }
    },
    delete: async (req, res) => {
        const { id } = req.headers;
        const user = await User.findByPk(id, {
            include: ['Images','Genres']
        });
        const image = await Image.findByPk(user.Images[0].id);
        const gender = await Gender.findByPk(user.Genres[0].id);
        const userCourse = await UserCourse.findAll({ where: { userId: user.id } });
        if(userCourse.length != 0){
            for(let associations of userCourse){
                await associations.destroy();
            }
        }
        const userVideo = await UserVideo.findAll({ where: { userId: user.id } });
        if(userVideo.length != 0){
            for(let associations of userVideo){
                await associations.destroy();
            }
        }
        if(image.path !== 'public/default-profile.png'){
            fs.unlink(image.path, async () => {
                await image.destroy();
                await gender.destroy();
                res.json(await user.destroy()); 
            })
        }
        else{
            await image.destroy();
            await gender.destroy();
            res.json(await user.destroy()); 
        }
    },
    auth: async (req, res) => {
        const { email, password } = req.body;
        try{
            const user = await User.findOne({where: { email, password }});
            if(user){
                const { id } = user;
                const token = jwt.sign({ id }, process.env.SECRET);
                res.json({ token });
            }
            else{
                res.status(401).json({ err: "Usuário não encontrado no sistema" });
            }
        }
        catch(err){
            res.status(500).json({ err: 'Algum erro inesperado aconteceu' });
        }
    },
    showCourses: async (req, res) => {
        const { id } = req.headers;
        const user = await User.findByPk(id, { include: [{as: "Courses", model: Course, include: 'Images'}, { as: 'Videos', model: Video, include: 'Sections', through: { where: { lastWatched: true } }  }] });
        res.json(user);
    },
    updatePassword: async (req, res) => {
        const { id } = req.headers;
        const { currentPassword, newPassword } = req.body;
        const user = await User.findByPk(id);
        if(user.password === currentPassword){
            user.password = newPassword;
            res.json(await user.save());
        }
        else{
            res.status(400).json({ err: "Senha atual incorreta" });
        }
    }
}