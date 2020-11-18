import {settings, select, classNames, templates} from '../settings.js';
import utils from '../utils.js';
import CartProduct from './CartProduct.js';

class Cart{
  constructor(element){
    const thisCart = this;

    thisCart.products = [];
    thisCart.deliveryFee = settings.cart.defaultDeliveryFee;

    thisCart.getElements(element);
    thisCart.initActions();

    //console.log('new cart: ', thisCart);
  }

  getElements(element){
    const thisCart = this;

    thisCart.dom = {};

    thisCart.dom.wrapper = element;
    thisCart.dom.toggleTrigger = thisCart.dom.wrapper.querySelector(select.cart.toggleTrigger);
    thisCart.dom.productList = thisCart.dom.wrapper.querySelector(select.cart.productList);
    thisCart.renderTotalsKeys = ['totalNumber', 'totalPrice', 'subtotalPrice', 'deliveryFee'];
    thisCart.dom.form = thisCart.dom.wrapper.querySelector(select.cart.form);
    thisCart.dom.phone = thisCart.dom.wrapper.querySelector(select.cart.phone);
    thisCart.dom.address = thisCart.dom.wrapper.querySelector(select.cart.address);

    for(let key of thisCart.renderTotalsKeys){
      thisCart.dom[key] = thisCart.dom.wrapper.querySelectorAll(select.cart[key]);
    }
  }

  initActions(){
    const thisCart = this;

    thisCart.dom.toggleTrigger.addEventListener('click', function() {
      thisCart.dom.wrapper.classList.toggle(classNames.cart.wrapperActive);
    });

    thisCart.dom.productList.addEventListener('updated', function() {
      thisCart.update();
    });

    thisCart.dom.productList.addEventListener('remove', function() {
      thisCart.remove(event.detail.cartProduct);
    });

    thisCart.dom.form.addEventListener('submit', function() {
      event.preventDefault();
      if (thisCart.dom.phone.value.length >= 9 && thisCart.dom.address.value.length >= 9) {
        thisCart.dom.phone.classList.remove(classNames.cart.inputError);
        thisCart.dom.address.classList.remove(classNames.cart.inputError);
        thisCart.sendOrder();
      } else if (thisCart.dom.phone.value.length <= 9 && thisCart.dom.address.value.length >= 9){
        thisCart.dom.phone.classList.add(classNames.cart.inputError);
        thisCart.dom.address.classList.remove(classNames.cart.inputError);
        alert('Invalid phone number, please correct it');
      } else if (thisCart.dom.phone.value.length >= 9 && thisCart.dom.address.value.length <= 9){
        thisCart.dom.phone.classList.remove(classNames.cart.inputError);
        thisCart.dom.address.classList.add(classNames.cart.inputError);
        alert('Invalid phone number, please correct it');
      } else {
        thisCart.dom.phone.classList.add(classNames.cart.inputError);
        thisCart.dom.address.classList.add(classNames.cart.inputError);
        alert('Invalid phone number and adress, please correct it');
      }
      //thisCart.sendOrder();
    });
  }

  add(menuProduct){
    const thisCart = this;
    //console.log ('Adding product: ', menuProduct);

    //generate HTML
    const generatedHTML = templates.cartProduct(menuProduct);
    //make DOM
    const generatedDOM = utils.createDOMFromHTML(generatedHTML);
    //add DOM
    const cartContainer = thisCart.dom.productList;
    //insert HTML to container
    cartContainer.appendChild(generatedDOM);

    thisCart.products.push(new CartProduct(menuProduct, generatedDOM));
    thisCart.update();
  }

  update(){
    const thisCart = this;
    thisCart.totalNumber = 0;
    thisCart.subtotalPrice = 0;

    for (let product of thisCart.products){
      thisCart.subtotalPrice += product.price;
      thisCart.totalNumber += product.amount;
    }

    if (thisCart.totalNumber == 0){
      thisCart.deliveryFee = 0;
    }
    else {
      thisCart.deliveryFee = settings.cart.defaultDeliveryFee;
    }

    thisCart.totalPrice = thisCart.subtotalPrice + thisCart.deliveryFee;
    console.log(thisCart.totalNumber, thisCart.subtotalPrice, thisCart.totalPrice);

    for(let key of thisCart.renderTotalsKeys){
      for(let elem of thisCart.dom[key]){
        elem.innerHTML = thisCart[key];
      }
    }
  }

  remove(cartProduct){
    const thisCart = this;
    const index = thisCart.products.indexOf(cartProduct);
    thisCart.products.splice(index, 1);
    cartProduct.dom.wrapper.remove();
    thisCart.update();
  }

  sendOrder(){
    const thisCart = this;

    const url = settings.db.url + '/' + settings.db.order;

    const payload = {
      address: thisCart.dom.address.value,
      phone: thisCart.dom.phone.value,
      totalNumber: thisCart.totalNumber,
      subtotalPrice: thisCart.subtotalPrice,
      deliveryFee: thisCart.deliveryFee,
      totalPrice: thisCart.totalPrice,
      products: [],
    };

    for (let product of thisCart.products) {
      product.getData();
      payload.products.push(product);
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    fetch(url, options)
      .then(function(response){
        return response.json();
      })
      .then(function(parsedResponse){
        console.log('parsed response: ', parsedResponse);
      });

    thisCart.products = [];
    thisCart.dom.productList.innerHTML = '';
    thisCart.dom.phone.value = '';
    thisCart.dom.address.value = '';
    thisCart.update();
  }
}

export default Cart;
