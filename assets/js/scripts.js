// assets/js/scripts.js
// Complete logic for MovieTicketPortal (BookMyShow-style)
$(document).ready(function () {

  // ---------- CONFIG ----------
  const API_KEY = 'edd42274f26cd68468ddad7f979a053d';
  const IMG_BASE = 'https://image.tmdb.org/t/p/w500';
  const BASE_TICKET_PRICE = 150; // ₹150 base
  const HALL_MULTIPLIERS = {
    "Hall 1": 1.0,
    "Hall 2": 1.2,
    "Hall 3": 1.5,
    "Hall 4": 2.0,
    "Hall 5": 2.6
  };

  const SHOW_TIMES = ["10:00 AM", "1:00 PM", "4:00 PM", "7:00 PM", "10:00 PM"];

  // ---------- UI ----------
  $('#year, #year2, #year3, #year4').text(new Date().getFullYear());

  // ---------- LOCATION SELECTOR ----------
  const LOCATIONS = [
    { code: '', label: 'All Regions' },
    { code: 'IN', label: 'India' },
    { code: 'US', label: 'United States' },
    { code: 'GB', label: 'United Kingdom' },
    { code: 'KR', label: 'Korea' },
    { code: 'JP', label: 'Japan' },
    { code: 'FR', label: 'France' }
  ];

  function populateLocationSelectors() {
    LOCATIONS.forEach(loc => {
      $('#locationSelect, #locationSelect2').append(`<option value="${loc.code}">${loc.label}</option>`);
    });
    const saved = localStorage.getItem('mtp_location') || '';
    $('#locationSelect, #locationSelect2').val(saved);
    $('#currentLocationLabel').text(saved ? saved : 'All Regions');
  }
  populateLocationSelectors();

  $(document).on('change', '#locationSelect, #locationSelect2', function () {
    const val = $(this).val();
    localStorage.setItem('mtp_location', val);
    $('#locationSelect, #locationSelect2').val(val);
    $('#currentLocationLabel').text(val ? val : 'All Regions');
    if ($('#movieContainer').length) loadMovies('#movieContainer', true);
    if ($('#movieContainerAll').length) loadMovies('#movieContainerAll', false);
  });

  // ---------- LOAD MOVIES ----------
  function loadMovies(containerId, isHomePage = false) {
    const $container = $(containerId);
    if ($container.length === 0) return;
    $container.empty();
    $('#loader').show();

    const apiURLs = [
      `https://api.themoviedb.org/3/movie/now_playing?api_key=${API_KEY}&language=en-US&region=US`,
      `https://api.themoviedb.org/3/movie/now_playing?api_key=${API_KEY}&language=en-IN&region=IN`
    ];

    Promise.all(apiURLs.map(url => $.getJSON(url)))
      .then(responses => {
        const combinedMovies = responses.flatMap(r => r.results || []);
        const uniqueMovies = [...new Map(combinedMovies.map(m => [m.id, m])).values()];
        uniqueMovies.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));

        // 🎬 Assign top 5 movies to 5 halls
        const hallAssignments = {
          "Hall 1": uniqueMovies[0],
          "Hall 2": uniqueMovies[1],
          "Hall 3": uniqueMovies[2],
          "Hall 4": uniqueMovies[3],
          "Hall 5": uniqueMovies[4]
        };

        $('#loader').hide();
        const final = isHomePage ? uniqueMovies.slice(0, 12) : uniqueMovies;

        final.forEach(movie => {
          const poster = movie.poster_path
            ? `${IMG_BASE}${movie.poster_path}`
            : 'assets/images/placeholder.jpg';
          const titleSafe = $('<div>').text(movie.title || movie.original_title || 'Untitled').html();

          const card = `
            <div class="col-lg-3 col-md-4 col-sm-6 mb-4 d-flex movie-card-col" 
                 data-title="${titleSafe.replace(/[^a-zA-Z0-9 ]/g, '').toLowerCase()}">
              <div class="card movie-card shadow-sm flex-fill h-100">
                <img src="${poster}" class="card-img-top movie-poster" alt="${titleSafe}">
                <div class="card-body d-flex flex-column">
                  <h5 class="card-title text-center">${titleSafe}</h5>
                  <p class="text-muted small text-center mb-2">
                    ⭐ ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'} 
                    &nbsp;|&nbsp; ${movie.release_date || '-'}
                  </p>
                  <button class="btn btn-primary mt-auto book-btn" 
                          data-id="${movie.id}"
                          data-title="${titleSafe}"
                          data-poster="${poster}"
                          data-price="${BASE_TICKET_PRICE}">
                    Book Now
                  </button>
                </div>
              </div>
            </div>`;
          $container.append(card);
        });

        localStorage.setItem('hallAssignments', JSON.stringify(hallAssignments));
      })
      .catch(() => {
        $('#loader').hide();
        $container.html(`<div class="col-12 text-center text-danger">❌ Failed to load movies.</div>`);
      });
  }

  if ($('#movieContainer').length) loadMovies('#movieContainer', true);
  if ($('#movieContainerAll').length) loadMovies('#movieContainerAll', false);

  // ---------- BOOK NOW ----------
  $(document).on('click', '.book-btn', function () {
    const movieData = {
      id: $(this).data('id'),
      title: $(this).data('title'),
      poster: $(this).data('poster'),
      price: parseFloat($(this).data('price')),
      showTime: 'Today, 10:00 AM',
      theater: 'Main Theater'
    };
    localStorage.setItem('selectedMovie', JSON.stringify(movieData));
    window.location.href = 'booking.html';
  });

  // ---------- BOOKING PAGE ----------
  if ($('#seatGrid').length) {
    const stored = JSON.parse(localStorage.getItem('selectedMovie') || 'null');
    const selectedMovie = stored || { title: 'Selected Movie', poster: 'assets/images/placeholder.jpg', price: BASE_TICKET_PRICE, showTime: 'Today, 10:00 AM', theater: 'Main Theater' };
    const hallAssignments = JSON.parse(localStorage.getItem('hallAssignments') || '{}');

    // 🏛️ Populate Halls + assign labels
    $('#theaterSelect').empty();
    const hallLabels = {
      "Hall 1": "Normal",
      "Hall 2": "Upgraded",
      "Hall 3": "Large",
      "Hall 4": "VIP",
      "Hall 5": "IMAX"
    };

    Object.keys(HALL_MULTIPLIERS).forEach(hall => {
      $('#theaterSelect').append(`<option value="${hall}">${hall} (${hallLabels[hall]})</option>`);
    });

    $('#bookingMovieTitle').text(selectedMovie.title);
    $('#moviePoster').attr('src', selectedMovie.poster);
    $('#ticketPrice').text((selectedMovie.price || BASE_TICKET_PRICE).toFixed(2));
    $('#totalPrice').text('0.00');

    // 🎬 Generate showtimes
    // 🎬 Generate showtimes with proper AM/PM handling
function getHallShowtimes(hall) {
  if (hall === "Hall 5") {
    // IMAX – only 4 luxury shows
    return ["10:30 AM", "2:00 PM", "6:00 PM", "10:00 PM"];
  }

  const offsetMinutes = { "Hall 1": 0, "Hall 2": 10, "Hall 3": 25, "Hall 4": 45 };
  const baseTimes = ["10:00 AM", "1:00 PM", "4:00 PM", "7:00 PM", "10:00 PM"];
  const offset = offsetMinutes[hall] || 0;

  return baseTimes.map(time => {
    // Split hour, minute, and period (AM/PM)
    const [hourPart, rest] = time.split(':');
    const [minutePart, period] = rest.split(' ');

    let hour = parseInt(hourPart);
    let minutes = parseInt(minutePart);

    // Convert to 24-hour format for easier manipulation
    if (period === "PM" && hour !== 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;

    // Add the offset
    const totalMinutes = hour * 60 + minutes + offset;
    let newHour = Math.floor(totalMinutes / 60) % 24;
    let newMinutes = totalMinutes % 60;

    // Convert back to 12-hour format
    const newPeriod = newHour >= 12 ? "PM" : "AM";
    if (newHour === 0) newHour = 12;
    else if (newHour > 12) newHour -= 12;

    return `${newHour}:${newMinutes.toString().padStart(2, '0')} ${newPeriod}`;
  });
}


    // 🎟️ Generate seat layout (random occupied)
    function generateSeatLayout(hall) {
      const layouts = {
        "Hall 4": { rows: ['A','B','C','D','E'], seatsPerRow: 8 },
        "Hall 2": { rows: ['A','B','C','D','E','F'], seatsPerRow: 10 },
        "Hall 3": { rows: ['A','B','C','D','E','F','G'], seatsPerRow: 12 },
        "Hall 1": { rows: ['A','B','C','D','E','F','G','H'], seatsPerRow: 15 },
        "Hall 5": { rows: ['A','B','C','D','E','F','G','H','I','J'], seatsPerRow: 18 }
      };

      const config = layouts[hall] || layouts["Hall 1"];
      $('#seatGrid').empty();

        const selectedTime = $('#showTimeSelect').val() || "10:00 AM";
  let occupancyRate;

  if (selectedTime.includes("10:00") || selectedTime.includes("10:30")) {
    occupancyRate = Math.random() * 0.1 + 0.1; 
  } else if (selectedTime.includes("1:00") || selectedTime.includes("2:00") || selectedTime.includes("4:00") || selectedTime.includes("6:00")) {
    occupancyRate = Math.random() * 0.1 + 0.25; 
  } else {
    occupancyRate = Math.random() * 0.2 + 0.4; 
  }

      const totalSeats = config.rows.length * config.seatsPerRow;
      const occupiedCount = Math.floor(Math.random() * (totalSeats * 0.2)) + 5;
      const occupied = new Set();

      while (occupied.size < occupiedCount) {
        const randomRow = config.rows[Math.floor(Math.random() * config.rows.length)];
        const randomSeat = Math.floor(Math.random() * config.seatsPerRow) + 1;
        occupied.add(`${randomRow}${randomSeat}`);
      }

      config.rows.forEach(r => {
        const $row = $('<div>').addClass('seat-row');
        for (let i = 1; i <= config.seatsPerRow; i++) {
          const seatId = `${r}${i}`;
          const $s = $('<div>').addClass('seat').attr('data-seat', seatId).text(i);
          if (occupied.has(seatId)) $s.addClass('occupied');
          $row.append($s);
        }
        $('#seatGrid').append($row);
      });
    }

    // 🕓 Populate showtimes
    function populateShowtimes(hall) {
      const times = getHallShowtimes(hall);
      $('#showTimeSelect').empty();
      times.forEach(t => $('#showTimeSelect').append(`<option value="${t}">${t}</option>`));
    }

    // 💰 Calculate dynamic ticket price
    function calculateTicketPrice(hall, time) {
      let price = BASE_TICKET_PRICE * (HALL_MULTIPLIERS[hall] || 1);
      return price.toFixed(2);
    }

    function updatePrice() {
      const hall = $('#theaterSelect').val();
      const time = $('#showTimeSelect').val();
      const price = calculateTicketPrice(hall, time);
      $('#ticketPrice').text(price);
    }

    // Default setup
    const initialHall = $('#theaterSelect').val();
    generateSeatLayout(initialHall);
    populateShowtimes(initialHall);
    updatePrice();

    // 🎬 Updated Step 2 (regenerate seats for hall or showtime change)
    $('#theaterSelect').on('change', function () {
      const hall = $(this).val();
      const prevTime = $('#showTimeSelect').val();
      populateShowtimes(hall);
      generateSeatLayout(hall);
      if ($('#showTimeSelect option[value="' + prevTime + '"]').length > 0) {
        $('#showTimeSelect').val(prevTime);
      } else {
        $('#showTimeSelect').prop('selectedIndex', 0);
      }
      updatePrice();
    });

    $('#showTimeSelect').on('change', function () {
      const hall = $('#theaterSelect').val();
      generateSeatLayout(hall);
      updatePrice();
    });

    // 🎟️ Seat selection
    $(document).on('click', '.seat', function () {
      if ($(this).hasClass('occupied')) return;
      $(this).toggleClass('selected animate__animated animate__pulse');
      updateSelected();
    });

    function updateSelected(){
      const selected = $('.seat.selected').map(function(){ return $(this).data('seat'); }).get();
      const count = selected.length;
      const ticketPrice = parseFloat($('#ticketPrice').text()) || BASE_TICKET_PRICE;
      const total = count * ticketPrice;
      $('#selectedSeats').text(count ? selected.join(', ') : 'None');
      $('#seatCount').text(count);
      $('#totalPrice').text(total.toFixed(2));
    }

    $('#confirmBooking').on('click', function () {
      const seats = $('.seat.selected').map(function(){ return $(this).data('seat'); }).get();
      if (seats.length === 0) { alert('Please select at least one seat.'); return; }
      const total = parseFloat($('#totalPrice').text());
      const booking = {
        movieTitle: $('#bookingMovieTitle').text(),
        seats: seats.join(', '),
        totalPrice: `₹${total.toFixed(2)}`,
        showtime: $('#showTimeSelect').val(),
        theatre: $('#theaterSelect').val(),
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('lastBooking', JSON.stringify(booking));
      $('#modalContent').html(`<h5 class="text-success">✅ Booking Successful!</h5><p>Movie: <strong>${booking.movieTitle}</strong></p><p>Seats: <strong>${booking.seats}</strong></p><p>Total: <strong>${booking.totalPrice}</strong></p>`);
      const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
      modal.show();
    });
  }

  // ---------- CONFIRMATION ----------
  if ($('#confirmedSeats').length) {
    const last = JSON.parse(localStorage.getItem('lastBooking') || 'null');
    if (last) {
      $('#confirmedMovieTitle').text(last.movieTitle);
      $('#confirmedSeats').text(last.seats);
      $('#confirmedShowtime').text(last.showtime);
      $('#confirmedTheatre').text(last.theatre);
      $('#confirmedTotal').text(last.totalPrice);
      $('#printTicket').on('click', function(){ window.print(); });
    } else {
      $('#confirmedMovieTitle').text('No recent booking found');
      $('#confirmedSeats').text('-');
    }
  }

});
