const Section = require("../models/Section");
const Video = require("../models/Video");
const User = require("../models/User");
const UserCourse = require('../models/UserCourse');
const fs = require('fs');
const Seciton = require('../models/Section');
const UserVideo = require("../models/UserVideo");
const { findByPk } = require("../models/Section");

module.exports = {
    index: async (req, res) => {
        res.json(await Video.findAll());
    },
    store: async (req, res) => {
        if(req.file){
            const sectionId = req.params.id;
            const { title } = req.headers;
            const section = await Section.findByPk(sectionId);
            if(section){
                const userId = req.headers.id;
                const userCourse = await UserCourse.findOne({ where: { userId, courseId: section.courseId } });

                if(userCourse && userCourse.admin) {
                    res.json(await section.createVideo({ title, path: req.file.path }))
                }
                else{
                    res.status(401).json(({ err: "Curso não encontrado ou Usuário inexistente/não autorizado" }));
                } 
            } 
            else{
                res.status(400).json({err: "Seção não existe para cadastro de vídeo"});
            } 
        }
        else{
            res.status(400).json({ err: "Ocorreu um erro ao tentar fazer o upload do vídeo. Verifique o formato" });
        }
    },
    update: async (req, res) => {
        if(req.file){
            const userId = req.headers.id;
            const { id } = req.params;
            const { title } = req.headers;
            const video = await Video.findByPk(id);
            if(video){
                const section = await Section.findByPk(video.sectionId, { include: 'Courses' });
                const userCourse = await UserCourse.findOne({ where: { userId, courseId: section.Courses.id }});
                if(userCourse && userCourse.admin){
                    video.title = title;
                    fs.unlinkSync(video.path);
                    video.path = req.file.path;
                    res.json(await video.save());
                }
                else{
                    res.status(401).json(({ err: "Curso não encontrado ou Usuário inexistente/não autorizado" }));
                }
            }
            else{
                res.status(400).json(({ err: "Vídeo não encontrado" }));
            }
        }
        else{
            res.status(400).json({ err: "Ocorreu um erro ao tentar fazer o upload do vídeo. Verifique o formato" });
        }
        
    },
    delete: async (req, res) => {
        const userId = req.headers.id;
        const { id } = req.params;
        const video = await Video.findByPk(id);
        if(video){
            const section = await Section.findByPk(video.sectionId, { include: 'Courses' });
            const userCourse = await UserCourse.findOne({ where: { userId, courseId: section.Courses.id }});
            if(userCourse && userCourse.admin){
                fs.unlinkSync(video.path);
                const userVideo = await UserVideo.findAll({ where: { videoId: video.id } });
                if(userVideo.length != 0){
                    for(let association of userVideo){
                        await association.destroy();
                    }
                }
                res.json(await video.destroy());
            }
            else{
                res.status(401).json(({ err: "Curso não encontrado ou Usuário inexistente/não autorizado" }));
            }
        }
        else{
            res.status(400).json(({ err: "Vídeo não encontrado" }));
        }
    },
    associate: async (req, res) => {
        const userId = req.headers.id;
        const videoId = req.params.id;
        const video = await Video.findByPk(videoId);
        if(video){
            const user = await User.findByPk(userId);
            const { watchedTime } = req.body;
            const userVideo = await UserVideo.findOne({ where: { userId, lastWatched: true } });
            if(userVideo && userVideo.videoId != videoId){
                userVideo.watchedTime = watchedTime;
                userVideo.lastWatched = false;
                await userVideo.save();
            }

            const section = await Section.findByPk(video.sectionId);
            const userCourse = await UserCourse.findOne({ where: { userId, courseId: section.courseId } });

            if(userCourse){
                const userVideo = await UserVideo.findOne({ where: { userId, videoId } });
                if(userVideo)
                    res.json(await video.addUser(user, { through: { lastWatched: true } }));
                else
                    res.json(await video.addUser(user, { through: { lastWatched: true, watchedTime: 0 } }));

            }
            else{
                res.status(401).json({ err: "Usuário não permitido a realizar essa ação" });
            }
        }
        else{
            res.status(400).json({ err: "Vídeo não encontrado" });
        }
    },
    showAssociation: async (req, res) => {
        const { courseId } = req.params;
        const { id } = req.headers;
        try{
            const userVideo = await Video.findOne({ include: [{model: User, as:'Users', where: { id: id }, through:{ where: { lastWatched: true } }},{model: Section, as: 'Sections', where: { courseId }}] });
            if(userVideo)
                res.json(userVideo);
            else{
                const video = await Video.findOne({ include: { model: Section, as: 'Sections', where: { courseId } } });
                const user = await User.findByPk(id);

                await video.addUser(user, { through: { lastWatched: true, watchedTime: 0 } })
                const userVideo = await Video.findOne({ include: [{model: User, as:'Users', where: { id: id }, through:{ where: { lastWatched: true } }},{model: Section, as: 'Sections', where: { courseId }}] });

                res.json(userVideo);
            }
        }
        catch(err){
            res.status(500).json({ err: "Ocorreu um erro inesperado" });
        }
    },
    showLastWatched: async (req, res) => {
        const courseId = req.params.courseId;
        const userId = req.headers.id;
        res.json(await User.findByPk(userId, { include: { as: 'Videos', model: Video, include: {as: 'Sections', model: Section, where: { courseId } }, through: { where: { lastWatched: true} } }  }));
    },
    showUserVideo: async (req, res) => {
        const videoId = req.params.id;
        const userId = req.headers.id;
        const userVideo = await UserVideo.findOne({ where: { userId, videoId } });
        res.json(userVideo);
    },
    setCurrentVideoTime: async (req, res) => {
        const { watchedTime } = req.body;
        const videoId = req.params.id;
        const userId = req.headers.id;
        try{
            const user = await User.findByPk(userId);
            const video =  await Video.findByPk(videoId);
            res.json(await video.addUser(user, { through: { watchedTime } }));
        }
        catch(e){
            console.log(e);
        }
        
    }
}