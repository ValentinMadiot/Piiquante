//*--------------------------------------------------------------------------------
//*------------------------- LIBRAIRIE + FICHIER IMPORTE --------------------------
//*--------------------------------------------------------------------------------

//* IMPORT DU MODELE DE SAUCE
const Sauce = require('../models/Sauce')

//* IMPORT DE FS (SUPPRIME LES IMAGES)
const fs = require('fs')

//*--------------------------------------------------------------------------------
//*------------------------------ CONTROLLER SAUCES -------------------------------
//*--------------------------------------------------------------------------------

//* AFFICHER TOUTES LES SAUCES DE LA DATABASE AVEC LA METHODE ".find"
function getAllSauces(req, res, next) {
  Sauce.find({})
    .then(sauces => res.send(sauces))
    .catch(error => res.status(400).json({ error }))
}

//?--------------------------------------------------------------------------------

//* AFFICHER UNE SAUCE DE LA DATABASE SELECTIONNEE AVEC LA METHODE ".findOne"
function getOneSauce(req, res, next) {
  Sauce.findOne({ _id: req.params.id })
    .then(sauce => res.send(sauce))
    .catch(error => res.status(400).json({ error }))
}

//?--------------------------------------------------------------------------------

//* CREER UNE SAUCE DANS LA DATABASE
function createSauce(req, res, next) {
  //* PARSER L'OBJET DE LA REQUETE
  const sauceObject = JSON.parse(req.body.sauce)
  //* SUPPRIMER LE CHAMP "userId" DE LA REQUETE CLIENT
  delete sauceObject.userId
  //* CREER UN NOUVEL OBJET AVEC LE MODELE DE SAUCE
  const sauce = new Sauce ({
    //* ... = TOUS LES CHAMPS DE "sauceObject"
    ...sauceObject,
    //* RECUPERE "userId" DEPUIS LE TOKEN D'AUTHENTIFICATION
    userId: req.auth.userId,
    //* CREER L'URL DE L'IMAGE
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`, 
    //* DECLARER O POUR LES LIKE ET DISLIKE
    likes: 0,
    dislikes: 0,
    //* CREER UN TABLEAU VIDE POUR LES UTILISATEURS QUI VONT LIKE ET DISLIKE
    usersLiked: [],
    usersDisliked: []
  })
  //* ENRENGISTRER DANS LA DATABASE
  sauce.save()
    .then(() => res.status(201).json({ message: "Sauce enrengistr??e" }))
    .catch((error) => res.status(400).json( error ))
}

//?--------------------------------------------------------------------------------

//* MODIFIER UNE SAUCE AVEC LA METHODE ".updateOne"
function modifySauce(req, res, next) {
  //* VERIFIER S'IL Y A UN OBJET DANS NOTRE REQUETE "req.file"
  const sauceObject = req.file ? {
    //* PARSE L'OBJET DE LA REQUETE
    ...JSON.parse(req.body.sauce),
    //* CREER L'URL DE L'IMAGE
    imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
  //* ENSUITE RECUPERER LES DONNEES A MODIFIER "...req.body"
  } : {...req.body}
  //* SUPPRIMER LE CHAMP "userId" DE LA REQUETE
  delete sauceObject.userId
  //* CHERCHER L'OBJET DANS LA DATABASE
  Sauce.findOne({ _id: req.params.id })
    //* VERIFIER QUE L'UTILISATEUR EST LE PROPRIETAIRE DE L'OBJET A MODIFIER
    .then((sauce) => {
      //* SI "userId" DE LA DATABASE EST != DE "userId" DE LA REQUETE 
      if (sauce.userId != req.auth.userId) {
        //* ANNULER LA REQUETE ET RENVOI UN MSG "Non-autoris??"
        res.status(401).json({ message: 'Non-autoris??' })
      //* SI IL EST LE PROPRIETAIRE
      } else {
        //* SI L'UTILISATEUR CHANGE L'IMAGE, SUPPRIMER L'ANCIENNE
        if (req.file) {
          const filename = sauce.imageUrl.split("/images/")[1]
          fs.unlink(`images/${filename}`, () => {})
        }
        //* ECRASER LES ANCIENNES DONNEES PAR LES NOUVELLES => "sauceObject" 
        Sauce.updateOne({ _id: req.params.id}, {...sauceObject, _id: req.params.id})
          .then(() => res.status(200).json({message : ' Sauce modifi??e! '}))
          .catch(error => res.status(401).json({ error }))
      }
    })
    .catch((error) => res.status(400).json({ error }))
}

//?--------------------------------------------------------------------------------

//* SUPPRIMER UNE SAUCE AVEC LA METHODE ".deleteOne"
function deleteSauce(req, res, next) {
  //* CHERCHER L'OBJET DANS LA DATABASE
  Sauce.findOne({ _id: req.params.id })
  //* VERIFIER QUE L'UTILISATEUR EST LE PROPRIETAIRE DE L'OBJET A SUPPRIMER
    .then (sauce => {
      //* SI "userId" DE LA DATABASE EST != DE "userId" DE LA REQUETE
      if (sauce.userId != req.auth.userId) {
        //* ANNULER LA REQUETE ET RENVOI UN MSG "Non-autoris??"
        res.status(401).json({ message: 'Non-autoris??' })
      } else {
        //* SINON CHERCHER LE NOM DE L'IMAGE A SUPPRIMER AVEC "split"
        const filename = sauce.imageUrl.split('images/')[1]
        //* UTILISER FS POUR SUPPRIMER L'IMAGE
        fs.unlink(`images/${filename}`, () => {
          //* CALLBACK POUR SUPPRIMER LA SAUCE DE LA DATABASE
          Sauce.deleteOne({ _id: req.params.id })
            .then(() => res.status(200).json({ message: 'Sauce supprim??e !'}))
            .catch(error => res.status(400).json({ error }));
        })
      }
    })
    .catch(error => {res.status(500).json({ error })})
}

//?--------------------------------------------------------------------------------

//* LIKE OU DISLIKE UNE SAUCE
function likeDislikeSauce(req, res, next) {
  
  const like = req.body.like
  const userId = req.body.userId
  const sauceId = req.params.id
 
  //* +1 like
  if (like === 1) { 
    //* MODIFIER LA SAUCE DE LA REQUETE
    Sauce.updateOne({ _id: sauceId }, {
      //* AJOUTER "userId" DANS LE TABLEAU DES UTILISATEURS QUI ONT LIKE
      $push: { usersLiked: userId },
      //* AJOUTER "+1" SUR LE NOMBRE TOTAL DE LIKE
      $inc: { likes: +1 }
    })
      .then(() => res.status(200).json({ message: '1 like ajout?? !' }))
      .catch((error) => res.status(400).json({ error }))
  }

  //* +1 dislike
  if (like === -1) {
    //* MODIFIER LA SAUCE DE LA REQUETE
    Sauce.updateOne({ _id: sauceId }, {
      //* AJOUTER "userId" DANS LE TABLEAU DES UTILISATEURS QUI ONT DISLIKE
      $push: { usersDisliked: userId },
      //* AJOUTER "+1" SUR LE NOMBRE TOTAL DE DISLIKE
      $inc: { dislikes: +1 }
    })
      .then(() => { res.status(200).json({ message: '1 dislike ajout?? !' })})
      .catch((error) => res.status(400).json({ error }))
  }
  
  //* 0 like OU  0 dislike
  if (like === 0) {
    //* CHERCHER LA SAUCE A MODIFIER
    Sauce.findOne({ _id: sauceId })
      .then((sauce) => {
        //* SI L'UTILISATEUR A LIKE UNE SAUCE =>   
        if (sauce.usersLiked.includes(userId)) { 
          //* MODIFIER LA SAUCE DE LA REQUETE
          Sauce.updateOne({ _id: sauceId }, {
            //* RETIRER "userId" DU TABLEAU DES UTILISATEURS QUI ONT LIKE
            $pull: { usersLiked: userId },
            //* RETIRER "+1" SUR LE NOMBRE TOTAL DE LIKE
            $inc: { likes: -1 }
          })
            .then(() => res.status(200).json({ message: '-1 like' }))
            .catch((error) => res.status(400).json({ error }))
        }
        //* SI L'UTILISATEUR A DISLIKE UNE SAUCE =>   
        if (sauce.usersDisliked.includes(userId)) {
          //* MODIFIER LA SAUCE DE LA REQUETE
          Sauce.updateOne({ _id: sauceId }, {
            //* RETIRER "userId" DU TABLEAU DES UTILISATEURS QUI ONT DISLIKE
            $pull: { usersDisliked: userId },
            //* RETIRER "+1" SUR LE NOMBRE TOTAL DE DISLIKE
            $inc: { dislikes: -1 }
          })
            .then(() => res.status(200).json({ message: '-1 dislike' }))
            .catch((error) => res.status(400).json({ error }))
        }
      })
      .catch((error) => res.status(404).json({ error }))
  }
} 

//* EXPORTER LES FONCTIONS "...Sauce"
module.exports = {createSauce, getAllSauces, getOneSauce, modifySauce, deleteSauce, likeDislikeSauce}