// Liste de tout les caractères qu'on utilisera pour générer le code, ainsi que les caractères qui les entourent
const alphabet = [
	{ char: 'a', surrounding: ['z', 'q'] }, { char: 'b', surrounding: ['v', 'n'] }, { char: 'c', surrounding: ['v', 'd'] },
	{ char: 'd', surrounding: ['s', 'e', 'f', 'c'] }, { char: 'e', surrounding: ['z', 'r'] }, { char: 'f', surrounding: ['d', 'r', 'g'] },
	{ char: 'g', surrounding: ['f', 'h'] }, { char: 'h', surrounding: ['g', 'y'] }, { char: 'i', surrounding: ['u', 'o'] },
	{ char: 'k', surrounding: ['l', 'i'] }, { char: 'l', surrounding: ['k', 'o'] }, { char: 'n', surrounding: ['b', 'h'] },
	{ char: 'o', surrounding: ['i', 'l'] }, { char: 'q', surrounding: ['a', 's'] }, { char: 'r', surrounding: ['e', 't'] },
	{ char: 's', surrounding: ['q', 'd'] }, { char: 't', surrounding: ['r', 'y'] }, { char: 'u', surrounding: ['y', 'i'] },
	{ char: 'v', surrounding: ['c', 'b'] }, { char: 'y', surrounding: ['t', 'u'] },
	{ char: 'z', surrounding: ['a', 'e'] } // IMPORTANT: toujours garder au moins 2 éléments uniques dans surrounding
	/*, { char: '1', surrounding: ['2'] }, { char: '2', surrounding: ['1','3'] },
	{ char: '3', surrounding: ['2','4'] }, { char: '4', surrounding: ['3','5'] }, { char: '5', surrounding: ['4','6'] },
	{ char: '6', surrounding: ['5','7'] }, { char: '7', surrounding: ['6','8'] }, { char: '8', surrounding: ['7','9'] },
	{ char: '9', surrounding: ['8','0'] }, { char: '0', surrounding: ['9'] },*/ // j'ai tenté de rendre le code plus propre ptdrr
]

// Fonction qui génère un code aléatoire
function generateCode(length){
	// Générer tout les caractères
	var code = ''
	for(var i = 0; i < length; i++){
		// Si on a pas de caractère, on en génère un aléatoire
		if(code.length < 1){
			code += alphabet[Math.floor(Math.random() * alphabet.length)].char
			continue
		} else {
			// Sinon, on prend le précédent caractère et on lui ajoute un caractère assez proche
			var lastChar = code[code.length - 1]
			var lastCharIndex = alphabet.findIndex(char => char.char === lastChar)
			var surrounding = alphabet[lastCharIndex].surrounding
			var char = surrounding[Math.floor(Math.random() * surrounding.length)]

			// On évite que le caractère soit le même que le précédent
			while(char === lastChar) char = surrounding[Math.floor(Math.random() * surrounding.length)] // si le caractère est le même, on en génère un autre

			// On évite à moitié que le caractère soit le même que l'avant dernier
			if(code.length > 1){
				var beforeLastChar = code[code.length - 2]
				if(char === beforeLastChar) char = surrounding[Math.floor(Math.random() * surrounding.length)]
			}

			// On ajoute le caractère au code
			code += char
		}
	}

	// On veut pas beaucoup de chiffres dans les codes, donc si on en a plus de deux, on les remplace par des lettres
	var numbers = code.match(/[0-9]/g)
	var alphabetWithoutNumbers = alphabet.filter(char => !char.char.match(/[0-9]/g))
	if(numbers && numbers.length > (length - 4)){
		numbers.forEach(number => {
			var index = code.indexOf(number)
			code = code.slice(0, index) + alphabetWithoutNumbers[Math.floor(Math.random() * alphabetWithoutNumbers.length)].char + code.slice(index + 1)
		})
	}

	// On retourne le code
	return code
}

module.exports = generateCode