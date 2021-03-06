import {classNames, select, settings, templates} from '../settings.js';
import utils from '../utils.js';
import AmountWidget from './AmountWidget.js';
import DatePicker from './DatePicker.js';
import HourPicker from './HourPicker.js';

class Booking {
  constructor(element){
    const thisBooking = this;

    thisBooking.render(element);
    thisBooking.initWidgets();
    thisBooking.getData();
    thisBooking.reserveTableInitial();
  }

  getData(){
    const thisBooking = this;

    const startDateParam = settings.db.dateStartParamKey + '=' + utils.dateToStr(thisBooking.datePicker.minDate);
    const endDateParam = settings.db.dateEndParamKey + '=' + utils.dateToStr(thisBooking.datePicker.maxDate);

    const params = {
      booking: [
        startDateParam,
        endDateParam,
      ],
      eventsCurrent: [
        settings.db.notRepeatParam,
        startDateParam,
        endDateParam,
      ],
      eventsRepeat: [
        settings.db.repeatParam,
        endDateParam,
      ],
    };

    //console.log('getData params', params);

    const urls = {
      booking:       settings.db.url + '/' + settings.db.booking + '?' + params.booking.join('&'),
      eventsCurrent: settings.db.url + '/' + settings.db.event + '?' + params.eventsCurrent.join('&'),
      eventsRepeat:  settings.db.url + '/' + settings.db.event + '?' + params. eventsRepeat.join('&'),
    };

    //console.log('urls', urls);

    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
    ])
      .then(function(allResponses){
        const bookingsResponse = allResponses[0];
        const eventsCurrentResponse = allResponses[1];
        const eventsRepeatResponse = allResponses[2];
        return Promise.all ([
          bookingsResponse.json(),
          eventsCurrentResponse.json(),
          eventsRepeatResponse.json(),
        ]);
      })
      .then(function([bookings, eventsCurrent, eventsRepeat]){
        //console.log(bookings);
        //console.log(eventsCurrent);
        //console.log(eventsRepeat);
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });
  }

  parseData(bookings, eventsCurrent, eventsRepeat){
    const thisBooking = this;

    thisBooking.booked = {};

    for(let item of bookings){
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    for(let item of eventsCurrent){
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    const minDate = thisBooking.datePicker.minDate;
    const maxDate = thisBooking.datePicker.maxDate;

    for(let item of eventsRepeat){
      if(item.repeat == 'daily'){
        for(let loopDate = minDate; loopDate <= maxDate; loopDate = utils.addDays(loopDate, 1)){
          thisBooking.makeBooked(utils.dateToStr(loopDate), item.hour, item.duration, item.table);
        }
      }
    }
    //console.log('thisBooking.booked', thisBooking.booked);
    thisBooking.updateDOM();
  }

  makeBooked(date, hour, duration, table){
    const thisBooking = this;

    if(typeof thisBooking.booked[date] == 'undefined'){
      thisBooking.booked[date] = {};
    }

    const startHour = utils.hourToNumber(hour);

    for(let hourBlock = startHour; hourBlock < startHour + duration; hourBlock += 0.5){
      //console.log('loop', hourBlock);

      if(typeof thisBooking.booked[date][hourBlock] == 'undefined'){
        thisBooking.booked[date][hourBlock] = [];
      }

      thisBooking.booked[date][hourBlock].push(table);
    }
  }

  updateDOM(){
    const thisBooking = this;

    thisBooking.date = thisBooking.datePicker.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);

    let allAvailable = false;

    if (
      typeof thisBooking.booked[thisBooking.date] == 'undefined'
      ||
      typeof thisBooking.booked[thisBooking.date][thisBooking.hour] == 'undefined'
    ){
      allAvailable = true;
    }

    for (let table of thisBooking.dom.tables){
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);
      if(!isNaN(tableId)){
        tableId = parseInt(tableId);
      }

      if(
        !allAvailable
        &&
        thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId)
      ){
        table.classList.add(classNames.booking.tableBooked);
      } else {
        table.classList.remove(classNames.booking.tableBooked);
      }
    }
    //console.log('thisBooking.booked', thisBooking.booked);
    thisBooking.colorfulSlider();
  }

  reserveTableInitial(){
    const thisBooking = this;
    for (let table of thisBooking.dom.tables){
      table.addEventListener('click', function(event){
        if (!table.classList.contains(classNames.booking.tableBooked)){
          thisBooking.reserveTable(event);
        }
      });
    }

    thisBooking.dom.datePicker.addEventListener('change', function(){
      for (let table of thisBooking.dom.tables){
        table.classList.remove(classNames.booking.tableReserving);
      }
    });

    thisBooking.hourInput = thisBooking.generatedDOM.querySelector(select.widgets.hourPicker.input);
    thisBooking.hourInput.addEventListener('change', function(){
      for (let table of thisBooking.dom.tables){
        table.classList.remove(classNames.booking.tableReserving);
      }
    });
  }

  reserveTable(event){
    const thisBooking = this;
    for (let table of thisBooking.dom.tables){
      table.classList.remove(classNames.booking.tableReserving);
      event.target.classList.add(classNames.booking.tableReserving);
    }

  }

  sendReservation(){
    const thisBooking = this;

    const url = settings.db.url + '/' + settings.db.booking;

    let pickedTable = '';

    for (let table of thisBooking.dom.tables){
      if(table.classList.contains(classNames.booking.tableReserving)){
        let tableId = table.getAttribute(settings.booking.tableIdAttribute);
        pickedTable = parseInt(tableId);
        table.classList.remove(classNames.booking.tableReserving);
      }
    }

    const payload = {
      date: thisBooking.datePicker.value,
      hour: thisBooking.hourPicker.value,
      table: pickedTable,
      repeat: false,
      duration: thisBooking.hoursAmount.value,
      ppl: thisBooking.peopleAmount.value,
      phone: thisBooking.dom.phone.value,
      adress: thisBooking.dom.address.value,
    };
    //console.log(payload);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    fetch(url, options)
      .then(response => response.json())
      .then(parsedResponse => {
        thisBooking.makeBooked(parsedResponse.date, parsedResponse.hour, parsedResponse.duration, parsedResponse.table);
        thisBooking.updateDOM();
      });
    //console.log('thisBooking.booked', thisBooking.booked);
    thisBooking.dom.phone.value = '';
    thisBooking.dom.address.value = '';
    thisBooking.hoursAmount.value = '1';
    thisBooking.peopleAmount.value = '1';

  }

  colorfulSlider(){
    const thisBooking = this;
    const bookedHours = thisBooking.booked[thisBooking.date];
    const sliderColours = ['/*99*/ green 0%, green 100%']; // to prevent adding a color other than green for hours without any reserved table

    thisBooking.dom.rangeSlider = thisBooking.dom.wrapper.querySelector('.rangeSlider');
    const slider = thisBooking.dom.rangeSlider;

    for (let bookedHour in bookedHours){
      const hourStart = ((bookedHour -12) *100) / 12;
      const hourEnd =  (((bookedHour -12) + 0.5) *100) / 12;
      if (bookedHours[bookedHour].length <= 1) {
        sliderColours.push('/*' + bookedHour + '*/ green ' + hourStart + '% ,green ' +  hourEnd + '%'); // /* */ added for correct sorting !
      } else if (bookedHours[bookedHour].length == 2) {
        sliderColours.push('/*' + bookedHour + '*/ orange ' + hourStart + '%, orange ' + hourEnd + '%');
      } else if (bookedHours[bookedHour].length == 3) {
        sliderColours.push('/*' + bookedHour + '*/ red ' + hourStart + '%, red ' + hourEnd + '%');
      }
    }

    sliderColours.sort();
    const coloursAll = sliderColours.join();
    slider.style.background = 'linear-gradient(to right, ' + coloursAll + ')';
  }


  render(element){
    const thisBooking = this;
    const generateHTML = templates.bookingWidget();

    thisBooking.dom = {};
    thisBooking.dom.wrapper = element;
    thisBooking.generatedDOM = utils.createDOMFromHTML(generateHTML);
    thisBooking.dom.wrapper.appendChild(thisBooking.generatedDOM);

    thisBooking.dom.peopleAmount = thisBooking.generatedDOM.querySelector(select.booking.peopleAmount);
    thisBooking.dom.hoursAmount = thisBooking.generatedDOM.querySelector(select.booking.hoursAmount);
    thisBooking.dom.datePicker = thisBooking.generatedDOM.querySelector(select.widgets.datePicker.wrapper);
    thisBooking.dom.hourPicker = thisBooking.generatedDOM.querySelector(select.widgets.hourPicker.wrapper);
    thisBooking.dom.tables = thisBooking.generatedDOM.querySelectorAll(select.booking.tables);
    thisBooking.dom.order = thisBooking.generatedDOM.querySelector(select.booking.orderConfirmationButton);
    thisBooking.dom.phone = thisBooking.generatedDOM.querySelector(select.booking.phone);
    thisBooking.dom.address = thisBooking.generatedDOM.querySelector(select.booking.address);
  }

  initWidgets(){
    const thisBooking = this;

    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);
    thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
    thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);

    thisBooking.generatedDOM.addEventListener('updated', function(){
      thisBooking.updateDOM();
    });
    thisBooking.dom.order.addEventListener('click', function(event){
      event.preventDefault();
      thisBooking.sendReservation();
    });
  }
}

export default Booking;
