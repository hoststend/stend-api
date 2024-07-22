// Configurer les variables d'env
require('dotenv').config()

// On listera quelques variables ici
var downloadTokens = [] // Liste des tokens de téléchargement
var reverseProxy = process.env.USING_REVERSE_PROXY == 'cloudflare' ? 'cloudflare' : process.env.USING_REVERSE_PROXY ? 'true' : false // Si on utilise un reverse proxy, on le précise ici

// Importer quelques librairies
const fastify = require('fastify')({ logger: { level: 'info' }, trustProxy: reverseProxy ? true : false })
fastify.register(require('@fastify/formbody'))
fastify.register(require('@fastify/cors'))
fastify.register(require('@fastify/multipart'))
const checkDiskSpace = require('check-disk-space').default
const fs = require('fs')
const path = require('path')
const pump = require('pump')
const JSONdb = require('simple-json-db')

// Importer des fonctions utiles
var generateCode = require('./utils/generateCode')
var getFiletype = require('./utils/getFiletype')

// Importer quelques éléments depuis les variables d'environnement
var storagePath = path.resolve(process.env.STORAGE_PATH || './storage') // Dossier d'enregistrement des fichiers
var fileMaxSize = parseInt(process.env.FILE_MAX_SIZE || 1000000000) // 1 Go
var chunkSize = parseInt(process.env.CHUNK_SIZE || 10000000) // 10 Mo
var apiPassword = process.env.API_PASSWORD || null // Mot de passe pour accéder à l'API
var apiVersion = require('./package.json').version || '0.0.0' // Version de l'API
var fileMaxAge = process.env.FILE_MAX_AGE == 0 ? 1.577e+10 : parseInt(process.env.FILE_MAX_AGE) || 2592000 // 30 jours
var diskSpaceMargin = isNaN(parseInt(process.env.DISK_SPACE_MARGIN)) ? 1000000 : parseInt(process.env.DISK_SPACE_MARGIN) // 1 Mo
var maxTransfersInMerge = 50 // Nombre maximum de transferts dans un groupe de transferts
console.log(`Marge: ${diskSpaceMargin}`)

// Créer les éléments de stockage s'ils n'existent pas
if(!fs.existsSync(storagePath)) fs.mkdirSync(storagePath)
const database = new JSONdb(path.join(storagePath, 'db.json'))

// Fonction pour générer une clé de partage
function generateShareKey(i=0){
	// On génère un code
	if(i < 10) var code = generateCode(8)
	else if(i < 20) var code = generateCode(12)
	else if(i < 30) var code = generateCode(24)
	else var code = generateCode(36) // juste pour être sûr

	// On vérifie que la clé n'existe pas déjà
	if(database.has(code)) return generateShareKey(i++)
	else return code // Sinon, on retourne la clé
}

// On supprime les groupes de transferts qui ont expiré
async function deleteExpiredGroups(){
	// On récupère tout les groupes
	var groups = Object.entries(database.JSON()).filter(([key, value]) => value.isGroup)
	console.log(`Checking for ${groups.length} groups...`)

	// On parcourt tout les groupes
	groups.forEach(([key, value]) => {
		// On vérifie chaque clé de partage
		if(value?.groups?.length) value.groups.forEach(shareKey => {
			// Si la clé de partage n'existe pas ou n'est pas uploadée, on la supprime du groupe
			if(!database.has(shareKey) || !database.get(shareKey).uploaded){
				console.log(`Deleting shareKey from group (group shareKey: ${key}, transfert shareKey: ${shareKey})`)
				value.groups = value.groups.filter(s => s != shareKey)
				return
			}
		})

		// Si le groupe est vide, on le supprime
		if(!value.groups.length){
			console.log(`Deleting group (shareKey: ${key}): transfers list is empty`)
			database.delete(key)
			return
		}

		// Sinon, on enregistre dans la db
		else database.set(key, value)
	})
}
setInterval(deleteExpiredGroups, 60000) // On vérifie toutes les minutes

// On supprime tout les transferts qui ont expiré
async function deleteExpiredTransfers(){
	// On récupère tout les transferts
	var transfers = fs.readdirSync(storagePath)
	console.log(`Checking for ${transfers.length-1} transfers...`) // on enlève 1 car il y a le fichier db.json

	// On récupère également la db
	var dbJson = database.JSON()

	// On parcourt tout les transferts
	for(var i = 0; i < transfers.length; i++){
		var transfer = transfers[i]
		var transferPath = path.join(storagePath, transfer)

		// Si le transfert n'est pas un dossier, on passe au suivant
		if(!fs.lstatSync(transferPath).isDirectory()) continue

		// On lit les informations du transfert
		var file
		try {
			file = JSON.parse(fs.readFileSync(path.join(transferPath, 'file.json'), 'utf8'))
		} catch(e) { file = null }
		console.log(`Checking transfer (shareKey: ${file?.shareKey}, transferKey: ${transfer}): uploaded: ${file?.uploaded} | creation: ${file?.created} | expire: ${file?.expireDate} | now: ${Date.now()}`)

		// Si le fichier n'existe pas, on supprime le transfert (c'est pas normal mais on sait jamais)
		if(!file){
			try {
				console.log(`Deleting transfer (shareKey: ${file?.shareKey}, transferKey: ${transfer}) because it is invalid: missing file.json`)
				fs.rmSync(transferPath, { recursive: true })
				var sharekey = Object.entries(dbJson).find(([key, value]) => value.transferKey === transfer)?.[0]
				if(sharekey) database.delete(sharekey)
			} catch(e) { console.error(e) }
		}

		// Si le transfert n'est pas uploadé, on vérifie s'il est plus vieux que 5 heures
		else if(!file.uploaded && Date.now() - file.created > 18000000){
			try { // Si oui, on supprime le dossier
				console.log(`Deleting transfer (shareKey: ${file.shareKey})`)
				fs.rmSync(transferPath, { recursive: true })
				database.delete(file.shareKey)
			} catch(e) { console.error(e) }
		}

		// Si le transfert est uploadé, on vérifie s'il est plus vieux que le temps d'expiration
		else if(file.uploaded && Date.now() > file.expireDate){
			try { // Si oui, on supprime le dossier
				console.log(`Deleting transfer (shareKey: ${file.shareKey})`)
				fs.rmSync(transferPath, { recursive: true })
				database.delete(file.shareKey)
			} catch(e) { console.error(e) }
		}
	}
}
setInterval(deleteExpiredTransfers, 60000) // On vérifie toutes les minutes

// Rediriger vers la documentation
fastify.get('/', async (req, res) => {
	return res.redirect("https://stend.johanstick.fr/api-docs/endpoints/intro")
})

// Obtenir les informations de l'instance
fastify.get('/instance', async (req, res) => {
	return {
		fileMaxSize,
		chunkSize,
		requirePassword: apiPassword ? true : false,
		apiVersion,
		fileMaxAge,
		maxTransfersInMerge,
		recommendedExpireTimes: [ // chaque valeur est en secondes
			{ label: '30 minutes', inSeconds: 1800 },
			{ label: '6 heures', inSeconds: 21600 },
			{ label: '12 heures', inSeconds: 43200 },
			{ label: '1 jour', inSeconds: 86400 },
			{ label: '4 jours', inSeconds: 345600 },
			{ label: '1 semaine', inSeconds: 604800 },
			{ label: '2 semaines', inSeconds: 1209600 },
			{ label: '1 mois', inSeconds: 2592000 },
			{ label: '3 mois', inSeconds: 7776000 },
			{ label: '6 mois', inSeconds: 15552000 },
			{ label: 'Infini', inSeconds: 1.577e+10 },
		].filter(time => time.inSeconds <= fileMaxAge).map(time => ({ label: time.label, inSeconds: time.inSeconds, value: Math.floor(time.inSeconds / 60) }))
	}
})

// Vérifier si le mot de passe est correct
fastify.post('/checkPassword', async (req, res) => {
	// Faire attendre volontairement l'utilisateur pour éviter les attaques bruteforce
	await new Promise(resolve => setTimeout(resolve, 300))

	// Si on a pas besoin de mot de passe
	if(!apiPassword) throw { statusCode: 400, error: "Mot de passe non requis", message: "Cette instance n'a pas besoin de mot de passe" }

	// Obtenir le mot de passe
	var password = req.headers.authorization

	// Vérifier le mot de passe
	if(!password?.length) throw { statusCode: 400, error: "Mot de passe manquant", message: "Vous devez entrer le mot de passe dans le header 'Authorization'" }
	if(password !== apiPassword) throw { statusCode: 401, error: "Mot de passe invalide", message: "Le mot de passe est invalide" }

	// Retourner un message de succès
	return { success: true }
})

// Créer un fichier
fastify.post('/files/create', async (req, res) => {
	// Faire attendre volontairement l'utilisateur pour éviter les attaques bruteforce
	await new Promise(resolve => setTimeout(resolve, 200))

	// Vérifier le mot de passe
	if(apiPassword && req.headers.authorization != apiPassword) throw { statusCode: 401, error: "Mot de passe invalide", message: "Le mot de passe est invalide" }

	// Obtenir les informations du fichier
	var fileName, fileSize, shareKey, expireTime
	try { fileName = JSON.parse(req.body).filename || req.body?.filename } catch(e) { fileName = req.body?.filename }
	try { fileSize = parseInt(JSON.parse(req.body).filesize || req.body?.filesize) } catch(e) { parseInt(fileSize = req.body?.filesize) } // en bytes
	try { shareKey = JSON.parse(req.body).sharekey || req.body?.sharekey } catch(e) { shareKey = req.body?.sharekey }
	try { expireTime = JSON.parse(req.body).expiretime || req.body?.expiretime } catch(e) { expireTime = req.body?.expiretime } // en secondes

	// Vérifier le nom du fichier
	if(!fileName || !fileName?.length) fileName = 'Sans nom'
	if(fileName.length > 200) fileName = fileName.slice(0, 200) // max 200 caractères

	// Vérifier la clé de partage
	if(!shareKey?.length) shareKey = generateShareKey()
	if(shareKey && typeof shareKey !== 'string') throw { statusCode: 400, error: "Clé de partage invalide", message: "La clé de partage doit être une chaîne de caractères" }
	shareKey = shareKey.replace(/[^a-zA-Z0-9]/g, '') // supprimer les caractères spéciaux
	shareKey = shareKey.toLowerCase()
	shareKey = shareKey.slice(0, 30) // max 30 caractères
	if(!shareKey?.length) shareKey = generateShareKey() // si la clé est vide, on en génère une nouvelle
	if(database.has(shareKey)) shareKey = generateShareKey() // si la clé existe déjà, on en génère une nouvelle

	// Vérifier le temps d'expiration (doit être une durée en secondes, inférieur à 30 jours)
	if(!expireTime) throw { statusCode: 400, error: "Temps avant expiration manquant", message: "Vous devez entrer la valeur 'expiretime' dans le body" }
	expireTime = parseInt(expireTime)
	if(isNaN(expireTime)) throw { statusCode: 400, error: "Temps avant expiration invalide", message: "Le temps avant expiration doit être un nombre" }
	if(expireTime > fileMaxAge) throw { statusCode: 400, error: "Temps avant expiration trop long", message: `Le temps avant expiration doit être inférieur à ${fileMaxAge} secondes` }

	// Vérifier le stockage disponible là où on veut stocker le fichier
	if(!fileSize) throw { statusCode: 400, error: "Taille du fichier manquante", message: "Vous devez entrer la valeur 'filesize' dans le body" }
	if(isNaN(fileSize)) throw { statusCode: 400, error: "Taille du fichier invalide", message: "La taille du fichier doit être un nombre" }
	if(fileSize > fileMaxSize) throw { statusCode: 400, error: "Fichier trop volumineux", message: "Le fichier est trop volumineux" }
	if(fileSize < 1) throw { statusCode: 400, error: "Fichier trop petit", message: "Le fichier est trop petit" }
	var diskSpace = await checkDiskSpace(storagePath)
	console.log(`free space: ${diskSpace.free} | disk margin: ${diskSpaceMargin} | file size: ${fileSize} | file + margin: ${parseInt(fileSize) + diskSpaceMargin}`)
	if(diskSpace.free < parseInt(fileSize) + diskSpaceMargin) throw { statusCode: 500, error: "Stockage insuffisant", message: "Il n'y a pas assez d'espace libre sur le serveur. Signalez ceci à l'administrateur de cette instance" }

	// Générer une clé de transfert
	var transferKey = generateCode(12)
	while(fs.existsSync(path.join(storagePath, transferKey))) transferKey = generateCode(12) // si la clé existe déjà, on en génère une nouvelle

	// Créer le fichier
	var file = {
		fileName: fileName,
		fileSize: fileSize,
		shareKey: shareKey,
		expireTime: expireTime,
		created: Date.now(),
		transferKey: transferKey,
		uploaded: false,
		chunkEvery: chunkSize,
		chunks: [],
	}

	// Calculer le nombre de chunks et les ajouter
	var chunkCount = Math.ceil(fileSize / chunkSize)
	for(var i = 0; i < chunkCount; i++){
		file.chunks.push({
			pos: i,
			uploaded: false,
			size: i === chunkCount - 1 ? fileSize - (chunkSize * (chunkCount - 1)) : chunkSize,
			uploadPath: `/files/uploadChunk?transferkey=${transferKey}&chunk=${i}`
		})
	}

	// Créer un dossier pour ce transfert
	var transferPath = path.join(storagePath, file.transferKey)
	fs.mkdirSync(transferPath)

	// Enregistrer les informations et un fichier vide
	fs.writeFileSync(path.join(transferPath, 'file.json'), JSON.stringify(file))
	fs.writeFileSync(path.join(transferPath, 'file'), '')

	// Enregistrer une information dans la db
	database.set(file.shareKey, {
		uploaded: false,
		transferKey: file.transferKey,
		deleteKey: null,
		fileName: file.fileName
	})
	console.log(`Created transfer (shareKey: ${file.shareKey}, transferKey: ${file.transferKey}) with size: ${fileSize} bytes (${chunkCount} chunks)`)

	// Retourner les informations
	return file
})

// Transférer un chunk
fastify.put('/files/uploadChunk', async (req, res) => {
	// Obtenir la clé de transfert et le numéro du chunk
	var transferKey = req.query?.transferkey
	var chunkPos = req.query?.chunk

	// Vérifier la clé de transfert
	if(!transferKey?.length) throw { statusCode: 400, error: "Clé de transfert manquante", message: "Vous devez entrer la valeur 'transferkey' dans le body ou dans l'URL" }
	if(transferKey && typeof transferKey !== 'string') throw { statusCode: 400, error: "Clé de transfert invalide", message: "La clé de transfert doit être une chaîne de caractères" }
	transferKey = transferKey.replace(/[^a-zA-Z0-9]/g, '') // supprimer les caractères spéciaux
	transferKey = transferKey.toLowerCase()
	if(!transferKey?.length) throw { statusCode: 400, error: "Clé de transfert invalide", message: "La clé de transfert est invalide" }
	if(!fs.existsSync(path.join(storagePath, transferKey))) throw { statusCode: 400, error: "Clé de transfert invalide", message: "La clé de transfert est invalide" }

	// Lire les informations du transfert
	var file = JSON.parse(fs.readFileSync(path.join(storagePath, transferKey, 'file.json'), 'utf8'))

	// Si le fichier est déjà uploadé, on renvoie une erreur
	if(file.uploaded) throw { statusCode: 400, error: "Fichier déjà uploadé", message: "Le fichier a déjà été uploadé" }

	// Vérifier quelques détails sur le chunk
	if(!chunkPos?.length) throw { statusCode: 400, error: "Numéro du chunk manquant", message: "Vous devez entrer la valeur 'chunk' dans le body ou dans l'URL" }
	chunkPos = parseInt(chunkPos)
	if(isNaN(chunkPos)) throw { statusCode: 400, error: "Numéro du chunk invalide", message: "Le numéro du chunk doit être un nombre" }
	if(chunkPos < 0) throw { statusCode: 400, error: "Numéro du chunk invalide", message: "Le numéro du chunk doit être supérieur à 0" }
	if(chunkPos > file.chunks.length - 1) throw { statusCode: 400, error: "Numéro du chunk invalide", message: "Le numéro du chunk est trop grand" }
	if(file.chunks[chunkPos].uploaded) throw { statusCode: 400, error: "Chunk déjà uploadé", message: "Le chunk a déjà été uploadé" }

	// Si le précédent chunk n'a pas été uploadé, on renvoie une erreur
	if(chunkPos > 0 && !file.chunks[chunkPos - 1].uploaded) throw { statusCode: 400, error: "Chunk précédent non uploadé", message: "Le chunk précédent n'a pas été uploadé" }

	// Recevoir le chunk et l'écrire
	var reqFile = await req.file({ limits: { fileSize: file.chunks[chunkPos].size } })
	var chunkPath = path.join(storagePath, transferKey, 'file')
	var chunkStart = chunkPos * chunkSize

	// Écrire le chunk
	var stream = fs.createWriteStream(chunkPath, { flags: 'a', start: chunkStart })
	if(!reqFile?.file) throw { statusCode: 400, error: "Chunk manquant", message: "Vous devez envoyer le chunk dans le body" }
	await new Promise((resolve, reject) => {
		pump(reqFile?.file, stream, (err) => {
			// Si il y a une erreur, on la renvoie
			if(err){
				console.error(err)
				throw { statusCode: 500, error: "Erreur lors de l'écriture du chunk", message: "Une erreur est survenue lors de l'écriture du chunk" }
			} resolve() // Sinon, on résout
		})
	})

	// Marquer le chunk comme uploadé
	console.log(`Uploaded chunk (transferKey: ${transferKey}, chunk: ${chunkPos}): chunkPos: ${chunkPos}`)
	file.chunks[chunkPos].uploaded = true

	// Si tous les chunks ont été uploadés, on marque le fichier comme uploadé
	if(file.chunks.every(chunk => chunk.uploaded)){
		// On ajoute/retire quelques informations
		file.chunks.forEach(chunk => delete chunk.uploadPath)
		file.uploaded = true
		file.uploadedAt = Date.now()
		file.expireDate = Date.now() + (file.expireTime * 1000)
		file.deleteKey = generateCode(16)

		// On obtient des infos sur celui qui a uploadé le fichier
		var ip = reverseProxy == 'cloudflare' ? (req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.ip) : reverseProxy == 'true' ? (req.headers['x-forwarded-for'] || req.headers['cf-connecting-ip'] || req.ip) : req.ip
		var userAgent = req.headers['user-agent']

		// Obtenir le type de fichier à partir du nom
		file.fileType = getFiletype(file.fileName)

		// Modifier l'information dans la db
		database.set(file.shareKey, {
			uploaded: file.uploaded,
			transferKey: file.transferKey,
			deleteKey: file.deleteKey,
			fileName: file.fileName,
			fileType: file.fileType || null,
			userAgent, ip
		})
		console.log(`Uploaded file (shareKey: ${file.shareKey}, transferKey: ${transferKey}): fileSize: ${file.fileSize} bytes (${file.chunks.length} chunks)`)
	}

	// Enregistrer les informations
	fs.writeFileSync(path.join(storagePath, transferKey, 'file.json'), JSON.stringify(file))

	// Retourner les informations
	if(file.uploaded) res.status(200).send(file)
	else return res.status(200).send()
})

// Regrouper plusieurs transferts en un
fastify.post('/files/merge', async (req, res) => {
	// Faire attendre volontairement l'utilisateur pour éviter les attaques bruteforce
	await new Promise(resolve => setTimeout(resolve, 200))

	// Vérifier le mot de passe
	if(apiPassword && req.headers.authorization != apiPassword) throw { statusCode: 401, error: "Mot de passe invalide", message: "Le mot de passe est invalide" }

	// Obtenir les clés de partage
	var shareKeys
	try { shareKeys = JSON.parse(req.body).sharekeys || req.body?.sharekeys } catch(e) { shareKeys = req.body?.sharekeys }
	if(shareKeys && typeof shareKeys !== 'string') throw { statusCode: 400, error: "Clés de partage invalides", message: "Les clés de partage doivent être une chaîne de caractères" }
	if(!shareKeys?.length) throw { statusCode: 400, error: "Clés de partage manquantes", message: "Vous devez entrer la valeur 'sharekeys' dans le body" }
	shareKeys = shareKeys.toLowerCase()
	shareKeys = shareKeys.split(',') // on sépare les clés de partage
	if(shareKeys.length < 2) throw { statusCode: 400, error: "Clés de partage insuffisantes", message: "Vous devez entrer au moins deux clés de partage" }
	if(shareKeys.length > maxTransfersInMerge) throw { statusCode: 400, error: "Clés de partage trop nombreuses", message: `Vous ne pouvez pas entrer plus de ${maxTransfersInMerge} clés de partage` }

	// Obtenir la clé de partage finale
	var mergedShareKey
	try { mergedShareKey = JSON.parse(req.body).sharekey || req.body?.sharekey } catch(e) { mergedShareKey = req.body?.sharekey }
	if(!mergedShareKey?.length) mergedShareKey = generateShareKey()
	if(mergedShareKey && typeof mergedShareKey !== 'string') throw { statusCode: 400, error: "Clé de partage invalide", message: "La clé de partage doit être une chaîne de caractères" }
	mergedShareKey = mergedShareKey.replace(/[^a-zA-Z0-9]/g, '') // supprimer les caractères spéciaux
	mergedShareKey = mergedShareKey.toLowerCase()
	mergedShareKey = mergedShareKey.slice(0, 30) // max 30 caractères
	if(!mergedShareKey?.length) mergedShareKey = generateShareKey() // si la clé est vide, on en génère une nouvelle
	if(database.has(mergedShareKey)) mergedShareKey = generateShareKey() // si la clé existe déjà, on en génère une nouvelle

	// Vérifier les clés de partage
	shareKeys.forEach(shareKey => {
		if(!shareKey?.length) throw { statusCode: 400, error: "Clé de partage invalide", message: "Une des clés de partages est invalide" }
		if(!database.has(shareKey)) throw { statusCode: 400, error: "Clé de partage invalide", message: "Une des clés de partages est invalide" }
	})

	// Vérifier que les fichiers sont uploadés
	shareKeys.forEach(shareKey => {
		if(!database.get(shareKey).uploaded) throw { statusCode: 400, error: "Fichier non uploadé", message: "Le fichier n'a pas encore été uploadé" }
	})

	// Ajouter un élément dans la base de données
	database.set(mergedShareKey, {
		uploaded: true,
		transferKey: null,
		deleteKey: null,
		fileName: null,
		isGroup: true,
		groups: shareKeys
	})
	console.log(`Merged files (shareKeys: ${shareKeys.join(' , ')}) into: ${mergedShareKey}`)

	// Retourner les informations
	return {
		shareKey: mergedShareKey,
		uploaded: true,
		transferKey: null,
		deleteKey: null,
		fileName: null,
		isGroup: true,
		groups: shareKeys
	}
})

// Obtenir les informations d'un fichier
fastify.get('/files/info', async (req, res) => {
	// Obtenir la clé de partage
	var shareKey = req.query?.sharekey

	// Vérifier la clé de partage
	if(!shareKey?.length) throw { statusCode: 400, error: "Clé de partage manquante", message: "Vous devez entrer la valeur 'sharekey' dans l'URL" }
	if(shareKey && typeof shareKey !== 'string') throw { statusCode: 400, error: "Clé de partage invalide", message: "La clé de partage doit être une chaîne de caractères" }
	shareKey = shareKey.replace(/[^a-zA-Z0-9]/g, '') // supprimer les caractères spéciaux
	shareKey = shareKey.toLowerCase()
	if(!shareKey?.length) throw { statusCode: 400, error: "Clé de partage invalide", message: "La clé de partage est invalide" }
	if(!database.has(shareKey)) throw { statusCode: 400, error: "Clé de partage invalide", message: "La clé de partage est invalide" }

	// Obtenir les infos depuis la db
	var dbInfo = database.get(shareKey)

	// Si c'est un groupe, on renvoie les informations
	if(dbInfo.isGroup) return dbInfo

	// Lire les informations du fichier
	var file
	try {
		file = JSON.parse(fs.readFileSync(path.join(storagePath, database.get(shareKey).transferKey, 'file.json'), 'utf8'))
	} catch(e) {
		database.delete(shareKey)
		throw { statusCode: 500, error: "Erreur de lecture", message: "Le fichier associé n'a pas pu être obtenu" }
	}

	// Si le transfert n'est pas uploadé, on renvoie une erreur
	if(!file.uploaded) throw { statusCode: 400, error: "Fichier non uploadé", message: "Le fichier n'a pas encore été uploadé" }

	// On génère un token de téléchargement
	var downloadToken = generateCode(16)
	downloadTokens.push({ token: downloadToken, shareKey: shareKey, expireDate: Date.now() + 7200000 }) // 2 heures

	// Retourner les informations
	return {
		...file,
		shareKey: undefined,
		transferKey: undefined,
		chunkEvery: undefined,
		chunks: undefined,
		deleteKey: undefined,
		downloadLink: `/files/download?sharekey=${shareKey}&token=${downloadToken}`
	}
})

// Télécharger un fichier
fastify.get('/files/download', async (req, res) => {
	// Obtenir la clé de partage et le token de téléchargement
	var shareKey = req.query?.sharekey
	var token = req.query?.token

	// Vérifier la clé de partage
	if(!shareKey?.length) throw { statusCode: 400, error: "Clé de partage manquante", message: "Vous devez entrer la valeur 'sharekey' dans l'URL" }
	if(shareKey && typeof shareKey !== 'string') throw { statusCode: 400, error: "Clé de partage invalide", message: "La clé de partage doit être une chaîne de caractères" }
	shareKey = shareKey.replace(/[^a-zA-Z0-9]/g, '') // supprimer les caractères spéciaux
	shareKey = shareKey.toLowerCase()
	if(!shareKey?.length) throw { statusCode: 400, error: "Clé de partage invalide", message: "La clé de partage est invalide" }
	if(!database.has(shareKey)) throw { statusCode: 400, error: "Clé de partage invalide", message: "La clé de partage est invalide" }

	// Vérifier le token de téléchargement
	if(!token?.length) throw { statusCode: 400, error: "Token de téléchargement manquant", message: "Vous devez entrer la valeur 'token' dans l'URL" }
	if(token && typeof token !== 'string') throw { statusCode: 400, error: "Token de téléchargement invalide", message: "Le token de téléchargement doit être une chaîne de caractères" }
	token = token.replace(/[^a-zA-Z0-9]/g, '') // supprimer les caractères spéciaux
	token = token.toLowerCase()
	if(!token?.length) throw { statusCode: 400, error: "Token de téléchargement invalide", message: "Le token de téléchargement est invalide ou expiré" }
	if(!downloadTokens.find(t => t.token === token)) throw { statusCode: 400, error: "Token de téléchargement invalide", message: "Le token de téléchargement est invalide ou expiré" }
	if(downloadTokens.find(t => t.token === token).shareKey !== shareKey) throw { statusCode: 400, error: "Token de téléchargement invalide", message: "Le token de téléchargement est invalide ou expiré" }

	// Si le token de téléchargement a expiré, on le supprime
	if(downloadTokens.find(t => t.token === token).expireDate < Date.now()){
		downloadTokens = downloadTokens.filter(t => t.token !== token)
		throw { statusCode: 400, error: "Token de téléchargement invalide", message: "Le token de téléchargement est invalide ou expiré" }
	}

	// Vérifier si le fichier a été uploadé
	var dbInfo = database.get(shareKey)
	if(!dbInfo.uploaded) throw { statusCode: 400, error: "Fichier non uploadé", message: "Le fichier n'a pas encore été uploadé" }

	// Renvoyer le fichier associé à cette clé de partage
	console.log(`A user is downloading a file.. (shareKey: ${shareKey})`)
	var fileSize = fs.statSync(path.join(storagePath, dbInfo.transferKey, 'file')).size
	var stream = fs.createReadStream(path.join(storagePath, dbInfo.transferKey, 'file'))
	res.header('Content-Disposition', `attachment; filename=${encodeURIComponent(dbInfo.fileName)}`)
	res.header('Content-Length', fileSize)
	return res.send(stream).type('application/octet-stream').code(200)
})

// Supprimer un transfert
fastify.delete('/files/delete', async (req, res) => {
	// Obtenir la clé de partage et la clé de suppression
	var shareKey = req.query?.sharekey
	var deleteKey = req.query?.deletekey

	// Vérifier la clé de partage
	if(!shareKey?.length) throw { statusCode: 400, error: "Clé de partage manquante", message: "Vous devez entrer la valeur 'sharekey' dans l'URL" }
	if(shareKey && typeof shareKey !== 'string') throw { statusCode: 400, error: "Clé de partage invalide", message: "La clé de partage doit être une chaîne de caractères" }
	shareKey = shareKey.replace(/[^a-zA-Z0-9]/g, '') // supprimer les caractères spéciaux
	shareKey = shareKey.toLowerCase()
	if(!shareKey?.length) throw { statusCode: 400, error: "Clé de partage invalide", message: "La clé de partage est invalide" }
	if(!database.has(shareKey)) throw { statusCode: 400, error: "Clé de partage invalide", message: "La clé de partage est invalide" }

	// Vérifier la clé de suppression
	if(!deleteKey?.length) throw { statusCode: 400, error: "Clé de suppression manquante", message: "Vous devez entrer la valeur 'deletekey' dans l'URL" }
	if(deleteKey && typeof deleteKey !== 'string') throw { statusCode: 400, error: "Clé de suppression invalide", message: "La clé de suppression doit être une chaîne de caractères" }
	deleteKey = deleteKey.replace(/[^a-zA-Z0-9]/g, '') // supprimer les caractères spéciaux
	deleteKey = deleteKey.toLowerCase()
	if(!deleteKey?.length) throw { statusCode: 400, error: "Clé de suppression invalide", message: "La clé de suppression est invalide" }
	if(database.get(shareKey).deleteKey !== deleteKey) throw { statusCode: 400, error: "Clé de suppression invalide", message: "La clé de suppression est invalide" }

	// Supprimer le dossier
	try {
		console.log(`A user is deleting a file.. (shareKey: ${shareKey})`)
		fs.rmSync(path.join(storagePath, database.get(shareKey).transferKey), { recursive: true })
		database.delete(shareKey)
	} catch(e) {
		throw { statusCode: 500, error: "Erreur de suppression", message: "Le fichier associé n'a pas pu être supprimé" }
	}

	// Retourner le succès
	return { success: true }
})

// Démarrer le serveur
fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' }, (err) => {
	if(err) fastify.log.error(err), process.exit(1)
	console.log(`Server listening on port ${fastify.server.address().port}`)
})
