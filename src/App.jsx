import { useEffect, useState } from 'react'
import { facilities } from "./customJS/facilities"
import clsx from 'clsx';
import { generate } from "random-words";
import { RegExpMatcher, TextCensor, englishDataset, englishRecommendedTransformers } from 'obscenity';


import './App.css'
import axios from 'axios';


function App() {

  // Profanity Matcher
  const matcher = new RegExpMatcher({
    ...englishDataset.build(),
    ...englishRecommendedTransformers,
  });

  // Static Values
  const keyboard = "abcdefghijklmnopqrstuvwxyz".toUpperCase().split("");


  // Initial Helper Function
  const resetKeyboard = () => {
    const newKeyboardState = {}
    keyboard.forEach(letter => {
      newKeyboardState[letter] = false
    })
    return newKeyboardState;
  }

  const genNewWord = () => {
    let newWord = generate({ minLength: 5, maxLength: 11 });
    while (matcher.hasMatch(newWord)) {
      newWord = generate({ minLength: 5, maxLength: 11 });
    }
    return newWord.toUpperCase();
  }

  const calculateWin = () => {
    for (let i = 0; i < currentWord.length; i++) {
      if (!guessedLetters[currentWord[i]]) return false;
    }
    return true;
  }

  // State Values
  const [currentWord, setCurrentWord] = useState(()=> genNewWord());
  const [currentHints, setHints] = useState({
    definition: {
      str: '',
      isShown: false,
      cost: 4
    },
    example: {
      str: '',
      isShown: false,
      cost: 4
    },
  });
  const [guessedLetters, setGuessedLetters] = useState(() => resetKeyboard());
  const [lives, setLives] = useState(facilities.length);

  // Derived Values
  const isLost = lives === 0;
  const isWon = calculateWin();
  const isGameOver = isLost || isWon
  const facilityLostIdx = facilities.length - (lives +1);


  // Helper Functions
  const addGuessedLetter = (letter) => {
    if (guessedLetters[letter] === true || isGameOver) return;
    setGuessedLetters(prevLetters => ({...prevLetters, [letter]:true}));
    if (!currentWord.includes(letter)) setLives(prevLives => prevLives - 1);
  }

  
  const handleReset = async() => {
    setGuessedLetters(resetKeyboard());
    setLives(facilities.length)
    setCurrentWord(genNewWord());
    setHints({
      definition: {
        str: '',
        isShown: false,
        cost: 4
      },
      example: {
        str: '',
        isShown: false,
        cost: 4
      },
    });
  }

  const handleHint = (str) => {
    const cost = currentHints[str].cost;
    if (lives - cost <= 0 || currentHints[str].isShown) return;
    setHints(prevHints => ({
      ...prevHints,
      [str]: {
        ...prevHints[str],
        isShown: true
      }
    }));
    setLives(prevLives => (prevLives - cost));
  }

  const capitalise = (val) => {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
  }


  const fetchWordData = async (word) => {
    if (!word) return;
    try {
      const res = await axios.get(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`
      )

      const data = res.data[0].meanings
      const chosenData = data[0];
      const definitions = chosenData.definitions;
      const chosenDefinition = definitions[0];

      return [chosenDefinition.definition, chosenDefinition.example]

      

    } catch (err) {
      console.error(err.response?.status === 404
        ? 'Word not found'
        : 'Error fetching definition');
        console.log(err);
      }
    }

    const cleanStr = (str) => {
      if (typeof str === 'undefined') return '';
      return str.replace(currentWord.toLowerCase(), '__').replace(capitalise(currentWord.toLowerCase()), '__');
    } 
    

  // Elements
  const facilitiesElem = facilities.map((facility, idx) => {
    const styles = {
      backgroundColor: facility.backgroundColor,
      color: facility.color
    }
    return (
      <span 
        key={facility.name} 
        className={clsx({chip:true, lost:idx < facilities.length - lives})}
        style={styles}>{facility.name}
      </span>
    )
  });

  const letterElems = currentWord.split("").map((letter, idx) => (
    <span 
      key={idx}
      className={clsx(
            isLost && !guessedLetters[letter] && "missed-letter"
        )}
    >{(guessedLetters[letter] || isGameOver) && letter}</span>
  ));

  const  keyboardElems = keyboard.map(letter => (
    <button 
      className={clsx({
        correct: guessedLetters[letter] &&  currentWord.includes(letter),
        wrong: guessedLetters[letter] &&  !currentWord.includes(letter),
      })}
      key={letter} 
      onClick={() => addGuessedLetter(letter)}
      disabled={isGameOver}
      aria-disabled={guessedLetters[letter]}
      aria-label={`Letter ${letter}`}
    >
      {letter}
    </button>
  ));

  const hintElems = Object.keys(currentHints).map((hintKey) => (
    currentHints[hintKey].str !== '' ? <div key={hintKey}>
      {!currentHints[hintKey].isShown ? <button onClick={() => handleHint(hintKey)}>Show</button> : null}
      <p>
        <b>{capitalise(hintKey)}</b>
        {!currentHints[hintKey].isShown && (` (-${currentHints[hintKey].cost})`)}
        : {
          currentHints[hintKey].isShown ? 
          currentHints[hintKey].str : '???'
        }
      </p>
    </div> : null
  ));

  
  useEffect(() => {
    const fetchInit = async () => {
      const [definition, example] = await fetchWordData(currentWord);
    
      setHints({
        definition: {
          str: cleanStr(definition),
          isShown: false,
          cost: 4
        },
        example: {
            str: cleanStr(example),
            isShown: false,
            cost: 4
          }
      });
    }
    fetchInit();
  },[currentWord])
  
  return (
      <main>
        <header>
          <h1>MARS Systems Reboot</h1>
          <p>Guess the code to restore life-support systems using the key pad. Previous codes: <b>LIZARD</b>, <b>VAULTING</b> and <b>PASSWORD</b>. You have <u>9 chances!</u> Use the hints at high cost to the facilities' integrity.</p>
        </header>
        <section 
          aria-live="polite" 
          role="status" 
          className={clsx('game-status', isWon && 'won', isLost && 'lost', (lives < 9 && !isGameOver) && 'damage')}
        >
          {isGameOver ? 
            (
              isWon ? (
                <>
                  <h2>🚀 Life-Support Rebooting 🚀</h2>
                  <p> You have saved the colony from certain doom.</p>
                </>
              ) : (
                <>
                  <h2>⚫ Life-Support Failure ⚫</h2>
                  <p> The console makes a winding down hum followed by the LED lights dimming to black.</p>
                </>
              )
            ) : (
              <p>{lives === 9 ? null : facilities[facilityLostIdx].message}</p>
            )
          }
        </section>
        
        <section className="facility-chips">
          {facilitiesElem}
        </section>
        <section className="word">
          {letterElems}
        </section>

        <section 
          className="sr-only" 
          aria-live="polite" 
          role="status"
        >
          <p>
            {}
          </p>
          <p>Current word:{currentWord.split("").map(letter => guessedLetters[letter] ? letter + "." :"blank.")}.join(" ")</p>
        </section>
        <section className="keyboard">
          {keyboardElems}
        </section>
        
        {isGameOver ? 
          <button className="new-game" onClick={handleReset}>New Game</button> 
        :
          (currentHints.definition.str !== '' && <section className="hints">
            <h2>Hints:</h2>
            <div>
              {hintElems}
            </div>
          </section>)  
        }
      </main>
  )
}

export default App
