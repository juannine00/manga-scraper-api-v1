const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const expressListEndpoints = require('express-list-endpoints');

const app = express();
const PORT = 3000;

const BASE_URL = 'https://komikcast.bz';
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

// **Perbaikan:** Fungsi untuk mengambil detail chapter
const chapterDetail = async (chapterPath) => {
    try {
        const { data } = await axios.get(`${BASE_URL}/${chapterPath}`);
        const $ = cheerio.load(data);

        const title = $('div.chapter_headpost h1').text().trim();
        const nextChapter = $('div.nextprev a[rel="next"]').attr('href');
        const images = []; 
        $('div.chapter_body div.main-reading-area').each((i, el) => {
            $(el).find('img').each((j, img) => {
                images.push($(img).attr('src'));
            });
        });

        return {
            title,
            nextChapter,
            images
        };
    } catch (error) {
        console.error(error);
        return null;
    }
};

// Route untuk mengambil daftar populer
app.get('/popular/:page', async (req, res) => {
    const { page } = req.params;
    const comics = await scrapePage(page);
    res.json(comics);
});

// Route untuk mengambil detail komik berdasarkan judul
app.get('/komik/:title', async (req, res) => {
    const { title } = req.params;
    const comicDetail = await scrapeComicDetail(title);
    if (!comicDetail) {
        res.status(404).json({ message: 'Comic not found' });
    } else {
        res.json(comicDetail);
    }
});

// **Perbaikan:** Route untuk mengambil detail chapter
app.get('/chapter/:title', async (req, res) => {
    const { title } = req.params;
    const chapterDetailResult = await chapterDetail(title);  // Memanggil fungsi yang benar
    if (!chapterDetailResult) {
        res.status(404).json({ message: 'Chapter not found' });
    } else {
        res.json(chapterDetailResult);
    }
});

// Route untuk pencarian komik
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

// Route untuk mengambil daftar genre
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

// Route untuk mengambil berdasarkan tipe
app.get('/types/:type/:page?', async (req, res) => {
    const { type, page = 1 } = req.params;
    const allowedTypes = ['manga', 'manhua', 'manhwa'];
    if (!allowedTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid type' });
    }
    const results = await scrapeType(type, page);
    res.json(results);
});

// Route untuk mengambil komik yang sedang berlangsung
app.get('/ongoing/:page?', async (req, res) => {
    const { page = 1 } = req.params;
    const results = await scrapeOngoing(page);
    if (!results) {
        res.status(404).json({ message: 'No results found' });
    } else {
        res.json(results);
    }
});

// Route untuk mengambil komik yang sudah selesai
app.get('/completed/:page?', async (req, res) => {
    const { page = 1 } = req.params;
    const results = await scrapeCompleted(page);
    if (!results) {
        res.status(404).json({ message: 'No results found' });
    } else {
        res.json(results);
    }
});

// Menjalankan server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
