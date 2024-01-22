#!/usr/bin/env node

// Importer quelques librairies
const readline = require('readline')
const fs = require('fs')
const path = require('path')
const JSONdb = require('simple-json-db')
const checkDiskSpace = require('check-disk-space').default
require('dotenv').config()

// Initialiser la base de données
var storagePath = path.resolve(process.env.STORAGE_PATH || './storage')
if(!fs.existsSync(storagePath)) fs.mkdirSync(storagePath)
const database = new JSONdb(path.join(storagePath, 'db.json'))

// Fonction pour poser une question
function askQuestion(question){
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	})

	return new Promise(resolve => {
		rl.question(question, answer => {
			rl.close()
			resolve(answer.trim())
		})
	})
}

// Fonction pour rendre un nombre d'octets plus lisible
function formatBytes(bytes, decimals = 2) {
	if (bytes === 0) return '0 Bytes'

	const k = 1024
	const dm = decimals < 0 ? 0 : decimals
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

	const i = Math.floor(Math.log(bytes) / Math.log(k))

	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// Fonction pour afficher une date/temps plus proprement
function formatDate(date){
	if(typeof date == 'string' || typeof date == 'number') date = new Date(date)
	return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
}

// Fonction principale
async function main(){
	// On vérifie si on a pas les réponses aux questions via les arguments
	var action = process.argv[2]
	var id = process.argv[3]
	var gotArgs = action

	// Log
	console.log("Bienvenue dans l'assistant d'administration de l'API de Stend !")
	if(!action){
		console.log("Vous pouvez quitter avec CTRL+C, ou en tapant 'exit'")
		console.log("\nActions disponibles :")
		console.log("  • Afficher les informations d'un transfert    (info)")
		console.log("  • Supprimer un transfert                      (delete)")
		console.log("  • Afficher le stockage utilisé                (storage)")
		console.log("  • Quitter                                     (exit)")
	}

	// Demander ce qu'on veut faire
	if(!action){
		console.log()
		action = await askQuestion("Que voulez-vous faire ? ")
	}

	// Traiter l'action
	if(action == 'info'){
		// Demander l'id du transfert
		if(!id) id = await askQuestion("Quel est la clé de partage du transfert ? ")

		// Récupérer les informations depuis la BDD
		const info = database.get(id)
		if(info){
			// Afficher les informations de la BDD
			console.log("\nInformations dans la BDD :")
			console.log("  • Statut                  : " + ((info?.uploaded ? "Uploadé" : "En cours d'envoi") || "N/A"))
			console.log("  • Clé de partage          : " + (id || "N/A"))
			console.log("  • Adresse IP de l'auteur  : " + (info?.ip || "N/A"))
			console.log("  • User Agent de l'auteur  : " + (info?.userAgent || "N/A"))
			if(info.isGroup) console.log("  • Contenu du groupe       : " + info?.groups?.join(' ; '))

			// Récupérer les informations depuis le fichier
			if(!info.isGroup) var filePath = path.join(storagePath, info?.transferKey, 'file.json')
			if(!info.isGroup && fs.existsSync(filePath)){
				const file = JSON.parse(fs.readFileSync(filePath))
				console.log("\nInformations dans le fichier :")
				console.log("  • Taille du fichier       : " + formatBytes(file?.fileSize))
				console.log("  • Date de création        : " + formatDate(file?.created))
				console.log("  • Date d'expiration       : " + formatDate(file?.expireDate))
				console.log("  • Durée initiale          : " + file?.expireTime + " secondes")
				console.log("  • Date d'envoi            : " + formatDate(file?.created))
			} else if(!info.isGroup) console.log("---- Impossible de récupérer les informations depuis le fichier")
		} else console.log("---- Impossible de récupérer ce transfert dans la BDD")
	}
	else if(action == 'delete'){
		// Demander l'id du transfert
		if(!id) id = await askQuestion("Quel est la clé de partage du transfert ? ")

		// Récupérer les informations depuis la BDD
		const info = database.get(id)
		if(!info) return console.log("---- Impossible de récupérer ce transfert dans la BDD")

		// Demander confirmation
		if(!gotArgs){
			var confirmation = await askQuestion("Êtes-vous sûr de vouloir supprimer ce transfert ? (y/N) ")
			if(confirmation.toLowerCase() != 'y') return console.log("---- Suppression annulée")
		}

		// Supprimer le dossier
		const folderPath = path.join(storagePath, info.transferKey)
		try {
			fs.rmSync(folderPath, { recursive: true })
			console.log("---- Fichier du transfert supprimé")
		} catch(e){ console.log("---- Impossible de supprimer le fichier du transfert") }

		// Supprimer de la BDD
		database.delete(id)
		console.log("---- Transfert supprimé de la BDD")
	}
	else if(action == 'storage'){
		// Récupérer la liste des transferts et leur taille
		var transferts = []
		var folders = fs.readdirSync(storagePath)
		for(var folder of folders){
			// On ignore les fichiers (on rentre que dans les dossiers)
			if(fs.statSync(path.join(storagePath, folder)).isFile()) continue

			// On récupère quelques infos sur le dossier
			var folderPath = path.join(storagePath, folder)
			var files = fs.readdirSync(folderPath)
			var size = 0

			// On passe sur chaque fichier du dossier pour obtenir la taille
			for(var file of files){
				var filePath = path.join(folderPath, file)
				var stats = fs.statSync(filePath)
				size += stats.size
			}

			// On ajoute le dossier à la liste des transferts
			transferts.push({ key: folder, size })
		}
		transferts = transferts.sort((a, b) => b.size - a.size)

		// On obtient le stockage disponible sur le disque
		var diskSpace = await checkDiskSpace(storagePath)

		// On affiche le résultat
		console.log(`\nStockage utilisé : ${formatBytes(transferts.reduce((a, b) => a + b.size, 0))} / ${formatBytes(diskSpace.free)} (${transferts.length} transferts)\n`)
		console.log(transferts.map(t => `  • ${t.key} : ${formatBytes(t.size)}`).join('\n'))
	}
	else if(action == 'exit'){
		process.exit()
	}
	else console.log("---- Action inconnue")
};
main()