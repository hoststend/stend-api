module.exports = function getFiletype(fileName){
	// Obtenir l'extension et le nom du fichier sans l'extension
	var filenameSplit = fileName.split('.')
	var extension = filenameSplit.pop().toLowerCase()
	var nameWithoutExt = filenameSplit?.[0] ?? fileName

	// On vérifie si le nom du fichier sans extension est connu
	switch (nameWithoutExt.toLowerCase()) {
		case "dockerfile":
			return "Instructions Docker";
		case "procfile":
			return "Instructions Heroku";
		case "license":
		case "licence":
			return "Licence";
		case "makefile":
			return "Instructions Make";
		case "qikfile":
			return "Instructions Qik";
		case "pipfile":
			return "Dépendances Python";
		case "authors":
			return "Liste des auteurs/contributeurs";
		case "codeowners":
			return "Liste des propriétaires";
		case "changelog":
			return "Journal des modifications";
	}

	// Sinon, on vérifie si l'extension du fichier est connue
	switch (extension) {
		// Documents
		case "pdf":
			return "Document PDF";
		case "doc":
		case "docx":
		case "odt":
		case "rtf":
		case "pages":
			return "Document texte";
		case "xls":
		case "xlsx":
		case "ods":
		case "csv":
		case "tsv":
		case "numbers":
			return "Feuille de calcul";
		case "ppt":
		case "pptx":
		case "odp":
		case "pps":
		case "ppsx":
		case "key":
			return "Présentation";
		case "txt":
			return "Texte brut";
		case "md":
			return "Document Markdown";

		// Archives
		case "zip":
		case "rar":
		case "7z":
		case "tar":
		case "gz":
			return "Archive compressée";

		// Multimédia
		case "jpg":
		case "jpeg":
		case "png":
		case "heic":
		case "webp":
		case "raw":
			return "Image";
		case "gif":
			return "Image animée";
		case "mp4":
		case "avi":
		case "mkv":
		case "mov":
			return "Vidéo";
		case "mp3":
		case "wav":
		case "flac":
		case "ogg":
		case "m4a":
		case "opus":
			return "Audio";

		// Icônes
		case "icns":
			return "Icône macOS";
		case "ico":
			return "Icône Windows";
		case "svg":
			return "Image vectorielle";

		// Fichiers 3d
		case "obj":
		case "fbx":
		case "stl":
		case "ply":
		case "dae":
			return "Modèle 3D";

		// Base de données
		case "sqlite":
		case "db":
		case "db3":
		case "sql":
			return "Base de données";

		// Livres électroniques
		case "epub":
		case "mobi":
			return "Livre électronique";

		// Applications et exécutables
		case "exe":
			return "Exécutable Windows";
		case "app":
			return "Application Apple";
		case "com":
			return "Exécutable DOS";
		case "bin":
			return "Binaire";

		// Installateurs et images disque
		case "apk":
		case "xapk":
		case "apks":
		case "apkm":
			return "Application Android";
		case "ipa":
			return "Application iOS";
		case "jar":
			return "Application Java";
		case "dmg":
			return "Image disque macOS";
		case "img":
		case "dsk":
		case "iso":
			return "Image disque";
		case "vhd":
		case "vhdx":
		case "vmdk":
		case "vdi":
		case "hdd":
			return "Disque virtuel";
		case "pkg":
			return "Installateur macOS";
		case "deb":
			return "Installateur Debian";
		case "rpm":
			return "Installateur Red Hat";
		case "appx":
		case "appxbundle":
		case "appinstaller":
		case "msix":
		case "msi":
			return "Installateur Windows";

		// Fichiers de configuration ou de données
		case "json":
		case "jsonc":
		case "json5":
		case "jsonl":
			return "Données JSON";
		case "xml":
		case "plist":
			return "Données XML";
		case "yaml":
		case "yml":
			return "Données YAML";
		case "ini":
		case "cfg":
		case "conf":
		case "config":
		case "properties":
			return "Format de configuration";

		// Langage de balisage
		case "html":
		case "htm":
			return "Page Internet";
		case "css":
			return "Feuille de style";

		// Langages de programmation
		case "js":
		case "mjs":
		case "cjs":
		case "ts":
		case "jsx":
		case "tsx":
			return "Script JavaScript";
		case "php":
		case "php3":
		case "php4":
			return "Script PHP";
		case "py":
		case "pyc":
			return "Script Python";
		case "rb":
			return "Script Ruby";
		case "java":
			return "Script Java";
		case "kt":
			return "Script Kotlin";
		case "swift":
			return "Script Swift";
		case "c":
		case "h":
		case "cpp":
		case "hpp":
			return "Script C/C++";
		case "cs":
			return "Script C#";
		case "go":
			return "Script Golang";
		case "rs":
			return "Script Rust";
		case "dart":
			return "Script Dart";
		case "sh":
		case "bash":
		case "zsh":
		case "fish":
		case "bat":
		case "cmd":
		case "ps1":
			return "Script Shell";
		case "vbs":
			return "Script VBS";
		case "lua":
			return "Script Lua";
		case "perl":
		case "pl":
			return "Script Perl";
		case "ahk":
			return "Script AutoHotkey";

		// Extensions de navigateur
		case "crx":
			return "Extension Chrome";
		case "xpi":
			return "Extension Firefox";

		// Raccourcis
		case "url":
			return "Raccourci Internet";
		case "lnk":
			return "Raccourci Windows";
		case "desktop":
			return "Raccourci Linux";

		// Kustom
		case "kwgt":
			return "Widget Kustom";
		case "klwp":
			return "Fond d'écran Kustom";
		case "komp":
			return "Pack de composants Kustom";
		case "ksh":
			return "Script Kustom";
		case "klck":
			return "Écran de verrouillage Kustom";

		// ROMs de jeux vidéo
		case "nes":
		case "sfc":
		case "smc":
		case "gba":
		case "gbc":
		case "gb":
		case "n64":
		case "rom":
		case "cso":
		case "nds":
		case "cia":
		case "ps2":
		case "xci":
		case "wad":
		case "nsp":
			return "ROM de jeu vidéo";

		// Fichiers de cache/temporaire
		case "cache":
		case "tmp":
		case "temp":
			return "Élément temporaire";

		// Police de caractères
		case "ttf":
		case "otf":
		case "woff":
		case "woff2":
			return "Police de caractères";

		// Logiciels de création
		case "psd":
			return "Projet Photoshop";
		case "ai":
			return "Projet Illustrator";
		case "xd":
			return "Projet Adobe XD";
		case "prproj":
			return "Projet Premiere Pro";
		case "indd":
			return "Projet InDesign";
		case "sketch":
			return "Projet Sketch";
		case "fig":
			return "Projet Figma";
		case "blend":
			return "Projet Blender";
		case "aep":
			return "Projet After Effects";
		case "aet":
			return "Projet Element 3D";
		case "c4d":
			return "Projet Cinema 4D";
		case "pxz":
			return "Projet Pixlr";
		case "xcf":
			return "Projet GIMP";
		case "logicx":
			return "Projet Logic Pro";
		case "xcodeproj":
			return "Projet Xcode";

		// Dotfiles
		case "env":
			return "Variables d'environnement";
		case "gitignore":
		case "gitattributes":
		case "gitconfig":
		case "gitmodules":
		case "gitkeep":
			return "Configuration de dépôt Git";
		case "npmignore":
		case "npmrc":
		case "npmfile":
			return "Configuration de projet NPM";
		case "dockerignore":
		case "dockerfile":
			return "Configuration de projet Docker";
		case "pylintrc":
		case "pyproject":
		case "pyup":
			return "Configuration de projet Python";
		case "eslintrc":
		case "eslintignore":
		case "eslintcache":
			return "Configuration ESLint";
		case "prettierrc":
		case "prettierignore":
		case "prettierconfig":
			return "Configuration Prettier";
		case "bash_profile":
		case "bashrc":
			return "Configuration de Bash";
		case "bash_history":
			return "Historique de Bash";
		case "zshrc":
		case "zshenv":
		case "zshlogin":
		case "zshlogout":
			return "Configuration de Zsh";
		case "zsh_history":
			return "Historique de Zsh";

		// Autres
		case "torrent":
		case "magnet":
			return "Téléchargement torrent";
		case "log":
			return "Journal";
		case "slbk":
			return "Sauvegarde Smart Launcher";
		case "srt":
		case "sub":
			return "Sous-titre";
		case "kvaesitso":
			return "Sauvegarde Kvaesitso";
		case "cur":
		case "ani":
			return "Icône de curseur";
		case "vcard":
		case "vcf":
			return "Fiche de contact";
		case "ics":
			return "Calendrier iCalendar";
		case "midi":
			return "Instrument MIDI";
		case "crt":
		case "cert":
			return "Certificat";
	}

	// Si on ne trouve pas de correspondance, on retourne null
	return null
}