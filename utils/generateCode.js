const charsGroups = [
	'df',
	'az',
	'iu',
	'li',
	'rt',
	're',
	'er',
	'nn',
	'po',
	'oi',
	'tu',
	'tr',
	'es',
	'ed',
	'as',
	'de',
	'mo',
	'se',
	'op',
	'lo',
	'zq',
	'tg',
	'cv',
	'pl',
	'sc',
	'om',
	'sdf',
	'oui',
	'jkl',
	'aze',
	'fer',
	'ser',
]

function chooseRandomCharGroup(lastChar){
	var random = charsGroups[Math.floor(Math.random() * charsGroups.length)]
	if(lastChar && (random.endsWith(lastChar) || random.startsWith(lastChar))) return chooseRandomCharGroup(lastChar)
	return random
}

// Fonction qui génère un code aléatoire
function generateCode(length = 8){
	var code = ''

	// Répéter jusque la longueur voulu soit atteinte
	while (code.length < length){
		var random = chooseRandomCharGroup(code[code.length - 1])
		if(code.length > 1 && code.endsWith(random)) continue
		code += random
	}

	// Cut le code s'il est trop long
	code = code.slice(0, length)

	// On retourne le code
	return code
}

module.exports = generateCode