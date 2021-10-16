function scrollToSection(section) {
  let navHeight = navbarElement.getBoundingClientRect().height;
  if (section) {
    let top = section.getBoundingClientRect().top;
    if (top > navHeight) {
      window.scrollBy({
        top: top - navHeight,
        behavior: 'smooth'
      });
    } else {
      window.scrollBy({
        top: top - navHeight,
        behavior: 'smooth'
      });
    }
  }
}

//navbar appears/disappears on scroll
let navbarElement = document.getElementById('navbar')
let headingElement = document.getElementById('site-heading');
let scrollToTopElem = document.getElementById('scrollToTop')
navbarElement.style.top = `-${navbarElement.getBoundingClientRect().height}px`;
let timeoutScrollToTop = null
document.addEventListener('scroll', e => {
  if (headingElement.getBoundingClientRect().bottom <= 0) {
    navbarElement.style.top = '0px';
    scrollToTopElem.classList.remove('hidden');
    if (timeoutScrollToTop != null) clearTimeout(timeoutScrollToTop);
    timeoutScrollToTop = setTimeout(()=>{
      scrollToTopElem.classList.add('hidden');
    }, 2000);
  } else {
    navbarElement.style.top = `-${navbarElement.getBoundingClientRect().height}px`;
    scrollToTopElem.classList.add('hidden');
  }
});

//clicking navbar img scrolls to top
document.querySelector('#navbar img').addEventListener('click', link => {
  window.scrollTo({
    behavior: 'smooth',
    left: 0,
    top: 0
  });
});

//navlinks scroll to respective sections on click
Array.prototype.forEach.call(document.getElementsByClassName('nav-link'), link => {
  link.addEventListener('click', e => {
    let src = link.getAttribute('src');
    if (src && src[0] == '#') {
      let section = document.querySelector(`section${src}`);
      scrollToSection(section);
    }
  });
});

//scroll to top button scrolls to top on click
scrollToTopElem.addEventListener('click', () => {
  window.scrollTo({
    behavior: 'smooth',
    left: 0,
    top: 0
  });
});

//events expand on click
function eventClick(e) {
  let events = document.getElementsByClassName('event');
  return () => {
    let wasExpanded = e.classList.contains('expanded');
    Array.prototype.forEach.call(events, evt => {
      evt.classList.remove('expanded');
      let more = evt.getElementsByClassName('eventMore')[0];
      if (more) more.innerHTML = (evt.classList.contains('expanded')) ? 'Less' : 'More';
    });
    if(!wasExpanded) e.classList.add('expanded');
    let moreButton = e.getElementsByClassName('eventMore')[0];
    if (moreButton) moreButton.innerHTML = (e.classList.contains('expanded')) ? 'Less' : 'More';
  }
}

Array.prototype.forEach.call(document.getElementsByClassName('event'), evt => evt.getElementsByClassName('eventMore')[0].addEventListener('click', eventClick(evt)));

//whole ticket button acts as link
function ticketsClick(e) {
  return () => {
    e.getElementsByTagName('a')[0].click();
  }
}

Array.prototype.forEach.call(document.getElementsByClassName('eventTickets'), evt => evt.addEventListener('click', ticketsClick(evt)));
