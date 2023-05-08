const puppeteer = require('puppeteer-extra');
const proxyChain = require('proxy-chain');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const CHANNEL_URL = 'https://www.youtube.com/channel/<CHANNEL_ID>/videos'; // Insert the channel URL here
const VIDEO_LINK_SELECTOR = 'a#video-title-link';

puppeteer.use(StealthPlugin());

(async () => {
  // const proxyList = [
  //   'http://173.192.21.89:80',
  //   'https://163.172.182.164:3128',
  //   'socks5://188.226.141.127:1080',
  //   'socks4://108.61.175.7:31802',
  //   'http://185.118.141.254:808',
  //   'https://217.113.122.142:3128'
  // ];
  // const randomProxy = proxyList[Math.floor(Math.random() * proxyList.length)];

  const browserPromises = Array.from({ length: 1 }, async () => {

    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/google-chrome',
      headless: false,
      defaultViewport: null, // Allows the page to have a large size, not limiting loading time
      args: ['--disable-web-security', '--no-sandbox', '--proxy-server=https://185.118.141.254:808'] // ignore CORS errors '--proxy-server=localhost:3128'`--proxy-server=${randomProxy}`
    });

    process.removeAllListeners();
    process.setMaxListeners(25);

    process.on('exit', () => {
      console.log('Exiting...');
    });

    const page = await browser.newPage();
    await page.setCacheEnabled(false); // disables browser cache

    console.log('Accessing YouTube channel...');
    await page.goto(CHANNEL_URL);

    await page.waitForSelector(VIDEO_LINK_SELECTOR);

    const videoLinks = await page.$$eval(VIDEO_LINK_SELECTOR, links => links.map(link => link.href)); // Obtém os links de todos os vídeos do canal
    console.log(`Encontrado ${videoLinks.length} links de vídeos no canal`);

    for (let i = 0; i < videoLinks.length; i++) {
      try {
        console.log(`Acessando o vídeo ${videoLinks[i]}...`);
        await page.goto(videoLinks[i], { timeout: 60000 }); // aumenta o timeout para 60 segundos
        console.log('Aguardando a reprodução do vídeo...');
        await page.waitForSelector('video', { timeout: 60000 }); // aumenta o timeout para 60 segundos
      1
        await page.evaluate(() => {
            const button = document.querySelector('button.ytp-ad-skip-button');
            if (button) {
              button.click();
            }
          });
          
        await page.waitForTimeout(5000);

        const channelName = await page.$eval('div.ytd-channel-name a.yt-simple-endpoint', el => el.textContent);
        if (channelName.includes('<CHANNEL_NAME>')) {
          console.log('O vídeo pertence ao canal desejado');
          const videoDuration = await page.$eval('span.ytp-time-duration', el => el.textContent);
          const durationArray = videoDuration.split(':');
          const durationSeconds = parseInt(durationArray[0]) * 60 + parseInt(durationArray[1]);
          const remainingTime = durationSeconds - 5;

          console.log(`Esperando ${remainingTime} segundos até o final do vídeo`);
          await page.waitForTimeout(remainingTime * 1000);
          await page.goBack();
        } else {
          console.log('Este vídeo não é do canal desejado. Indo para o próximo vídeo.');
          await page.waitForTimeout(10000);
        }
      } catch (error) {
        console.error(`Erro ao tentar assistir ao vídeo ${videoLinks[i]}: ${error}`);
        await page.goBack();
        await page.waitForTimeout(5000);
      }
    }

    await browser.close();
    console.log('O navegador foi fechado');
  });

})();
