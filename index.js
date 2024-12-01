const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const expressListEndpoints = require('express-list-endpoints');


const app = express();
const PORT = 3000;

const BASE_URL = 'https://komikcast.cz';
const PAGE_URL = `${BASE_URL}/daftar-komik/page/`;

// Scrape popular
const scrapePage = async (page) => {
    try {
        const { data } = await axios.get(`${PAGE_URL}${page}/?status=&type=&orderby=popular`);
        const $ = cheerio.load(data);
        const comics = [];

        $('div.list-update_item').each((i, element) => {
            const title = $(element).find('h3.title').text().trim();
            const chapter = $(element).find('div.chapter').text().trim();
            const rating = $(element).find('div.rating-bintang span').css('width');
            const type = $(element).find('span.type').text().trim();
            const imageUrl = $(element).find('img.ts-post-image').attr('src');
            const link = $(element).find('a.data-tooltip').attr('href');
            const path = new URL(link).pathname;

            comics.push({
                title,
                chapter,
                rating: parseFloat(rating) / 10,  
                type,
                imageUrl,
                link: path,
            });
        });

        return comics;
    } catch (error) {
        console.error(error);
        return [];
    }
};

// Scrape comic details
const scrapeComicDetail = async (comicPath) => {
    try {
        const { data } = await axios.get(`${BASE_URL}/${comicPath}`);
        const $ = cheerio.load(data);

        const imageUrl = $('div.komik_info-content-thumbnail img').attr('src');
        const title = $('h1.komik_info-content-body-title').text().trim();
        const nativeTitle = $('span.komik_info-content-native').text().trim();
        const genres = [];
        $('span.komik_info-content-genre a.genre-item').each((i, el) => {
            genres.push($(el).text().trim());
        });
        const released = $('span.komik_info-content-info-release').text().replace('Released:', '').trim();
        const author = $('span.komik_info-content-info').first().text().replace('Author:', '').trim();
        const status = $('span.komik_info-content-info:contains("Status")').text().replace('Status:', '').trim();
        const type = $('span.komik_info-content-info-type').text().replace('Type:', '').trim();
        const totalChapters = $('span.komik_info-content-info:contains("Total Chapter")').text().replace('Total Chapter:', '').trim();
        const updatedOn = $('span.komik_info-content-update time').attr('datetime');
        const rating = $('div.data-rating strong').text().replace('Rating', '').trim();
        const synopsis = $('div.komik_info-description-sinopsis').text().trim();

        // Scrape the chapter list
        const chapters = [];
        $('ul#chapter-wrapper li.komik_info-chapters-item').each((i, el) => {
            const chapterTitle = $(el).find('a.chapter-link-item').text().trim();
            const chapterLink = $(el).find('a.chapter-link-item').attr('href').replace(BASE_URL, '');
            const chapterTime = $(el).find('div.chapter-link-time').text().trim();
            chapters.push({ title: chapterTitle, link: chapterLink, time: chapterTime });
        });

        

        return {
            imageUrl,
            title,
            nativeTitle,
            genres,
            released,
            author,
            status,
            type,
            totalChapters,
            updatedOn,
            rating,
            synopsis,
            chapters, 
        };
    } catch (error) {
        console.error(error);
        return null;    
    }
};

const champterDetail = async (champterPath) => {
    try {
        const { data } = await axios.get(`${BASE_URL}/${champterPath}`);
        const $ = cheerio.load(data);

        const title = $('div.chapter_headpost h1').text().trim();
        const nextchapter = $('div.nextprev a[rel="next"]').attr('href');
        const image = []; 
        $('div.chapter_body div.main-reading-area').each((i, el) => {
            $(el).find('img').each((j, img) => {
                image.push($(img).attr('src'));
            });
        });


        return {
            title,
            nextchapter,
            image
        };
    } catch (error) {
        console.error(error);
        return null;
    }
};

const search = async (query, page) => {
    const { data } = await axios.get(`${BASE_URL}/page/${page}/?s=${query}`);
    const $ = cheerio.load(data);
    const results = [];

    $('div.list-update_item').each((i, element) => {
        const title = $(element).find('h3.title').text().trim();
        const image = $(element).find('div.list-update_item-image img.ts-post-image').attr('src');
        const chapter = $(element).find('div.chapter').text().trim();
        const rating = $(element).find('div.rating-bintang span').css('width');
        const type = $(element).find('span.type').text().trim();
        const link = $(element).find('a.data-tooltip').attr('href');
        const path = new URL(link).pathname;

        results.push({
            title,
            image,
            chapter, 
            rating: parseFloat(rating) / 10,
            type,
            link: path,
        });
    });

    return results;
};

const scrapeGenre = async (genre , page) => {
    try {
        const { data } = await axios.get(`${BASE_URL}/genres/${genre}/page/${page}`);
        const $ = cheerio.load(data);
        const results = [];

        $('div.list-update_item').each((i, element) => {
            const title = $(element).find('h3.title').text().trim();
            const image = $(element).find('div.list-update_item-image img.ts-post-image').attr('src');
            const chapter = $(element).find('div.chapter').text().trim();
            const rating = $(element).find('div.rating-bintang span').css('width');
            const type = $(element).find('span.type').text().trim();
            const link = $(element).find('a.data-tooltip').attr('href');
            const path = new URL(link).pathname;

            results.push({
                title,
                image,
                chapter,
                rating: parseFloat(rating) / 10,
                type,
                link: path,
            });
        });

        return results;
    } catch (error) {
        console.error(error);
        return null;
    }
};

const genreList = async () => {
    try {
        const { data } = await axios.get(`${BASE_URL}`);
        const $ = cheerio.load(data);
        const results = [];

        $('div.section ul.genre li a').each((i, element) => {
            const genre = $(element).text().trim();
            const link = $(element).attr('href').replace(BASE_URL, '');
            results.push({
                genre,
                link
            });
        });

        return results;
    } catch (error) {
        console.error(error);
        return null;
    }
};

const scrapeType = async (type, page) => {
    try {
        const { data } = await axios.get(`${BASE_URL}/daftar-komik/page/${page}/?status&type=${type}&orderby=titleasc`);
        const $ = cheerio.load(data);
        const results = [];

        $('div.list-update_item').each((i, element) => {
            const title = $(element).find('h3.title').text().trim();
            const image = $(element).find('div.list-update_item-image img.ts-post-image').attr('src');
            const chapter = $(element).find('div.chapter').text().trim();
            const rating = $(element).find('div.rating-bintang span').css('width');
            const type = $(element).find('span.type').text().trim();
            const link = $(element).find('a.data-tooltip').attr('href');
            const path = new URL(link).pathname;

            results.push({
                title,
                image,
                chapter,
                rating: parseFloat(rating) / 10,
                type,
                link: path,
            });
        });

        return results;
    } catch (error) {
        console.error(error);
        return null;
    }
};

const scrapeOngoing = async (page) => {
    try {
        const { data } = await axios.get(`${BASE_URL}/daftar-komik/page/${page}/?status=Ongoing&type&orderby=titleasc`);
        const $ = cheerio.load(data);
        const results = [];

        $('div.list-update_item').each((i, element) => {
            const title = $(element).find('h3.title').text().trim();
            const image = $(element).find('div.list-update_item-image img.ts-post-image').attr('src');
            const chapter = $(element).find('div.chapter').text().trim();
            const rating = $(element).find('div.rating-bintang span').css('width');
            const type = $(element).find('span.type').text().trim();
            const link = $(element).find('a.data-tooltip').attr('href');
            const path = new URL(link).pathname;

            results.push({
                title,
                image,
                chapter,
                rating: parseFloat(rating) / 10,
                type,
                link: path,
            });
        });

        return results;
    } catch (error) {
        console.error(error);
        return null;
    }
};

const scrapeCompleted = async (page) => {
    try {
        const { data } = await axios.get(`${BASE_URL}/daftar-komik/page/${page}/?status=Completed &type&orderby=titleasc`);
        const $ = cheerio.load(data);
        const results = [];

        $('div.list-update_item').each((i, element) => {
            const title = $(element).find('h3.title').text().trim();
            const image = $(element).find('div.list-update_item-image img.ts-post-image').attr('src');
            const chapter = $(element).find('div.chapter').text().trim();
            const rating = $(element).find('div.rating-bintang span').css('width');
            const type = $(element).find('span.type').text().trim();
            const link = $(element).find('a.data-tooltip').attr('href');
            const path = new URL(link).pathname;

            results.push({
                title,
                image,
                chapter,
                rating: parseFloat(rating) / 10,
                type,
                link: path,
            });
        });

        return results;
    } catch (error) {
        console.error(error);
        return null;
    }
};


app.get('/', (req, res) => {
    const endpoints = expressListEndpoints(app);
    const formattedEndpoints = endpoints.map(endpoint => {
      return {
        path: endpoint.path,
        methods: endpoint.methods,
        middlewares: endpoint.middleware,
        details: {
          description: `Handles ${endpoint.methods.join(', ')} requests for ${endpoint.path}`
        }
      };
    });
    
    res.json({
      message: "List of available endpoints",
      count: formattedEndpoints.length,
      endpoints: formattedEndpoints
    });
  });
// Route to get the list of popular
app.get('/popular/:page', async (req, res) => {
    const { page } = req.params;
    const comics = await scrapePage(page);
    res.json(comics);
});

// Route to get the details of a specific comic
app.get('/komik/:title', async (req, res) => {
    const { title } = req.params;
    const comicDetail = await scrapeComicDetail(title);
    if (!comicDetail) {
      res.status(404).json({ message: 'Comic not found' });
    } else {
      res.json(comicDetail);
    }
  });

app.get ('/chapter/:title', async (req, res) => {
    const { title } = req.params;
    const chapterDetail = await champterDetail(title);
    if (!chapterDetail) {
        res.status(404).json({ message: 'Chapter not found' });
    } else {
        res.json(chapterDetail);
    }
});

app.get('/search/:query/:page?', async (req, res) => {
    try {
      const { query, page = 1 } = req.params;
      const results = await search(query, page);
      if (!results) {
        res.status(404).json({ message: 'No results found' });
      } else {
        res.json(results);
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });

app.get('/genres/:genre/:page?', async (req, res) => {
    const { genre, page = 1 } = req.params;
    const results = await scrapeGenre(genre, page);
    if (!results) {
      res.status(404).json({ message: 'No results found' });
    } else {
      res.json(results);
    }
  });

app.get('/genres', async (req, res) => {
    const results = await genreList();
    res.json(results);
});

app.get('/types/:type/:page?', async (req, res) => {
  const { type, page = 1 } = req.params;
  const allowedTypes = ['manga', 'manhua', 'manhwa'];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }
  const results = await scrapeType(type, page);
  res.json(results);
});

app.get('/ongoing/:page?', async (req, res) => {
  const { page = 1 } = req.params;
  const results = await scrapeOngoing(page);
  if (!results) {
    res.status(404).json({ message: 'No results found' });
  } else {
    res.json(results);
  }
});


app.get('/completed/:page?', async (req, res) => {
    const { page = 1 } = req.params;
    const results = await scrapeCompleted(page);
    if (!results) {
        res.status(404).json({ message: 'No results found' });
      } else {
        res.json(results);
      }
  });
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
