module.exports = {
  navigation: [{
    route: 'home',
    permalink: '/',
    text: 'Home',
    heroSettings: {
      backgroundColor: '#00BCD4',
      backgroundImage: '/images/backgrounds/home.jpg',
      fontColor: '#FFFFFF',
      tabBarColor: '#FFFFFF',
      video: {
        title: 'GDG DevFest Sul 2015',
        youtubeId: 'RDQdNXp3uKU',
        text: 'Veja como foi em 2015'
      }
    }
  //}, {
  //  route: 'blog',
  //  permalink: '/blog',
  //  text: 'Blog',
  //  heroSettings: {
  //    backgroundColor: '#03A9F4',
  //    backgroundImage: '/images/backgrounds/blog.png',
  //    fontColor: '#FFFFFF',
  //    tabBarColor: '#FFFFFF'
  //  }
  }, {
    route: 'schedule',
    permalink: '/schedule',
    text: 'Programação',
    heroSettings: {
      backgroundColor: '#0f9954',
      fontColor: '#FFFFFF',
      tabBarColor: '#FFFFFF'
    }
  }, {
    route: 'speakers',
    permalink: '/speakers',
    text: 'Palestrantes',
    heroSettings: {
      backgroundColor: '#673AB7',
      fontColor: '#FFFFFF',
      tabBarColor: '#FFFFFF'
    }
  },{
    route: '#',
    permalink: 'https://docs.google.com/forms/d/1iLXCL0OEvmSnuQvVbAFLZ7y8CssLw-ohaE-XeVQZiLE/',
    text: 'Call4Papers',
    heroSettings: {
      backgroundColor: '#673AB7',
      fontColor: '#FFFFFF',
      tabBarColor: '#FFFFFF'
    }
  },{
  route: '#',
  permalink: 'https://www.sympla.com.br/devfest-parana-2016__83812',
  text: 'Ingressos',
  heroSettings: {
    backgroundColor: '#FF9B27',
    fontColor: '#FFFFFF',
    tabBarColor: '#FFFFFF'
  }
}

  ]
};
