/* global flatpickr */

import { select, settings } from '../settings.js';
import utils from '../utils.js';
import BaseWidget from './BaseWidget.js';

class DatePicker extends BaseWidget{
  constructor(wrapper){
    super(wrapper, utils.dateToStr(new Date()));

    const thisWidget = this;

    thisWidget.dom.input = thisWidget.dom.wrapper.querySelector(select.widgets.datePicker.input);

    thisWidget.initPulgin();
  }

  initPulgin(){
    const thisWidget = this;

    thisWidget.minDate = new Date(thisWidget.value);
    thisWidget.maxDate = utils.addDays(thisWidget.minDate, settings.datePicker.maxDaysInFuture);

    flatpickr(thisWidget.dom.input, {
      defaultDate: thisWidget.minDate,
      minDate: thisWidget.minDate,
      maxDate: thisWidget.maxDate,
      'locale': {
        firstDayOfWeek: 1
      },
      'disable': [
        function(date) {
          return (date.getDay() === 1);
        }
      ],
      onChange: function(dateStr){
        thisWidget.value = dateStr;
      }
    });
  }

  parseValue(value){
    return value;
  }

  isValid(value){
    return value == value;
  }

  renderValue(){
    const thisWidget = this;

    console.log(thisWidget.value);
  }
}

export default DatePicker;
