module.exports = {
  statistics: [{
    counter: 200,
    caption: 'Pessoas'
  }, {
    counter: 1,
    caption: 'Dia'
  }, {
    counter: 14,
    caption: 'Palestras'
  }, {
    counter: 2,
    caption: 'Trilhas paralelas'
  }],
  callToAction: {
    text: 'GDG DevFest Paraná 2016',
    buttonText: 'Veja como foi',
    video: {
     id: 'RDQdNXp3uKU',
     title: 'GDG DevFest Sul 2015'
    }
  },
  galleryBlock: {
    title: 'GDG DevFest Paraná 2016 - Fotos',
    photos: {
      big: '../images/backgrounds/2015_1.jpg',
      small: ['../images/backgrounds/2015_2.jpg', '../images/backgrounds/2015_3.jpg']
    },
    albumUrl: 'https://plus.google.com/events/c152p4tmk4h6n3ene4c424mhlik'
  },
  ticketsBlock: {
    title: 'Ingressos',
    tickets: [{
      name: 'Primeiro lote',
      price: 50,
      currency: 'BRL',
      //info: '*Before October 23 or 100 tickets.<br/>Requires valid student ID'
    }, {
      name: 'Segundo lote',
      price: 75,
      currency: 'BRL',
      //info: '*Before September 27 or 150 tickets'
    }, {
      name: 'Terceiro lote',
      price: 100,
      currency: 'BRL',
      //info: '*Before October 23'
    }],
    details: 'Ingresso dá acesso a todo o evento e 2 coffee breaks. Hospedagem não está inclusa no preço do ingresso.'
  },
  socialFeed: {
    source: '/data/tweets.json'
  },
  partnershipProposition: '/assets/Midiakit_DevfestPR_2016.pdf'
};
