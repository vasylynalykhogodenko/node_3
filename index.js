const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const port = 3000;

const bodyParser = require('body-parser');
app.use(bodyParser.json());

const dataPath = path.join(__dirname, 'top250.json');

async function readData() {
  try {
    const data = await fs.readFile(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data:', error);
    return [];
  }
}

async function writeData(data) {
    try {
        await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing data:', error);
    }
}

let films;
(async () => {
  try {
    films = await readData();
  } catch (error) {
    console.error('Error initializing films:', error);
  }
})();

app.get('/api/films/readall', (req, res) => {
  res.json(films.sort((a, b) => a.position - b.position));
});

app.get('/api/films/read/:id', (req, res) => {
  const { id } = req.params;
  const film = films.find(f => f.id === parseInt(id));

  if (!film) {
    return res.status(404).json({ message: 'Film not found' });
  }

  res.json(film);
});

app.post('/api/films/create', (req, res) => {
  const newFilm = req.body;

  if (!newFilm.title || !newFilm.rating || !newFilm.year || !newFilm.budget || !newFilm.gross || !newFilm.poster) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  if (isNaN(newFilm.year) || newFilm.year < 1888) {
    return res.status(400).json({ message: 'Invalid year' });
  }

  if (newFilm.budget < 0 || newFilm.gross < 0) {
    return res.status(400).json({ message: 'Budget and gross cannot be negative' });
  }

  newFilm.id = films.length + 1;

  const existingFilm = films.find(f => f.position === newFilm.position);

  if (existingFilm) {
    films.forEach(film => {
        if (film.position >= newFilm.position) {
        film.position++;
      }
    });
  }

  films.push(newFilm);
  writeData(films);
  res.json(newFilm);
});

app.post('/api/films/update/:id', async (req, res) => {
    const { id, ...updateFields } = req.params;

    const filmIndex = films.findIndex(f => f.id === parseInt(id));

    if (filmIndex === -1) {
      return res.status(404).json({ message: 'Film not found' });
    }

    const updatedFilm = { ...films[filmIndex], ...updateFields };

    if (updateFields.position) {
      const existingFilm = films.find(f => f.position === updateFields.position);

      if (existingFilm && existingFilm.id !== id) {
        films.forEach((film, index) => {
          if (film.position >= updateFields.position && film.id !== id) {
            film.position++;
          }
        });
      }
    }

    films[filmIndex] = updatedFilm;
    await writeData(films);
    res.json(updatedFilm);
  });

app.post('/api/films/delete/:id', (req, res) => {
  const { id } = req.params;

  const filmIndex = films.findIndex(f => f.id === parseInt(id));
  if (filmIndex === -1) {
    return res.status(404).json({ message: 'Film not found' });
  }

  films.splice(filmIndex, 1);

  films.forEach((film, index) => {
    if (index > filmIndex) {
      film.position--;
    }
  });

  writeData(films);
  res.json({ message: 'Film deleted' });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
