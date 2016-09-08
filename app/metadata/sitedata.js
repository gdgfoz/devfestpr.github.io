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
      currency: 'R$',
      info: 'Até o dia o 30 de Setembro'
    }, {
      name: 'Segundo lote',
      price: 75,
      currency: 'R$',
      info: 'Até o dia 14 de Outubro'
    }, {
      name: 'Terceiro lote',
      price: 100,
      currency: 'R$',
      info: 'Áté o dia 29 de Outubro'
    }],
    details: 'Ingresso dá acesso a todo o evento e 2 coffee breaks. Hospedagem não está inclusa no preço do ingresso.'
  },
  socialFeed: {
    source: '/data/tweets.json'
  },
  partnershipProposition: '/assets/Midiakit_DevfestPR_2016.pdf'
};
