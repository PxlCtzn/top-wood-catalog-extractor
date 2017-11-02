// ==UserScript==
// @name        Catalog Extractor for TopWood
// @namespace   io.pxlctzn.catalog_extractor.topwood
// @description Catalog Extractor for TopWood
// @version     1
// @grant       none
// @include     https://www.top-wood.com/fr/2-feuilles-de-placage
// @require     https://raw.githubusercontent.com/eligrey/FileSaver.js/master/FileSaver.min.js
// ==/UserScript==

// On ajoute le bouton pour générer le CSV
var generateBtn = document.createElement('input');
generateBtn.type = 'button';
generateBtn.value = 'Extract Catalog';
generateBtn.onclick = generateCatalog;
generateBtn.setAttribute('class', 'btn btn-danger');
generateBtn.setAttribute('style', 'position: fixed; right:20px; top:20px; z-index:20000;');
generateBtn.setAttribute('data-format', 'csv')
document.getElementById('page').appendChild(generateBtn);

/**
 * Main function.
 * Extracts all the products found in the page and displays them as CSV sheet.
 **/
function generateCatalog()
{
  header  = ["Name", "Width", "Width unit", "Height", "Height unit", "Thickness", "Thickness unit"]
  catalog = Array();
  
  products = document.getElementsByClassName('product-container');
  
  for (index_product = 0; index_product < products.length ; index_product++ )
  {
    product = products[index_product];
    product_description = product.querySelector('p.product-desc').innerText;
    
    title = product.querySelector('h5').innerText;
    
    thickness = extractThicknessData(product_description);
    dimension = extractDimension(product_description);
    
    prices    = extractPrices(product);
      
    catalog_entry = Array();
    
    catalog_entry["Name"]           = title;
    catalog_entry["Width"]          = formatWidth(dimension);
    catalog_entry["Width unit"]     = "mm";
    catalog_entry["Height"]         = formatHeight(dimension);
    catalog_entry["Height unit"]    = "mm";
    catalog_entry["Thickness"]      = thickness.thickness;
    catalog_entry["Thickness unit"] = thickness.thickness_unit;
    
    for ( index_prices = 0; index_prices < prices.length ; index_prices++)
    {
      price = prices[index_prices];
      header_label = "Prix unitaire pour "+price.quantity;
      if ( header.indexOf(header_label) == -1){
        header.push(header_label);
      }
      catalog_entry[header_label] = price.price;
    }
    catalog.push(catalog_entry);
  }
  

  var blob = new Blob([generateCSV(header, catalog)], {type: "text/plain;charset=utf-8"});
  saveAs(blob, "top_wood.catalog.csv");
}

function generateCSV(header, data)
{
  var content = '"' + header.join('";"') + '"\n';
  
  for ( index_data = 0; index_data < data.length ; index_data++)
  {
    entry = data[index_data];
    
    for ( index_header = 0; index_header < header.length ; index_header++)
    {
      header_label = header[index_header];
      if (!(header_label in entry))
      {
        content += '"";';
      } else {
        content += '"' + entry[header_label] + '";';
      }
    }

    content = content.slice(0,-1) + "\n";
  }  
  
  return content;
}

/**
 *
 **/
function formatWidth(dimension)
{
  if ( Object.keys(dimension).includes("width") && Object.keys(dimension).includes("width_unit") )
    return unitToMM(dimension.width, dimension.width_unit);
  
  if ( Object.keys(dimension).includes("width_min") && Object.keys(dimension).includes("width_max") && Object.keys(dimension).includes("width_unit"))
    return unitToMM(dimension.width_min, dimension.width_unit);
}

/**
 *
 **/
function formatHeight(dimension)
{
  if ( Object.keys(dimension).includes("height") && Object.keys(dimension).includes("height_unit") )
    return unitToMM(dimension.height, dimension.height_unit);
  
  if ( Object.keys(dimension).includes("height_min") && Object.keys(dimension).includes("height_max") && Object.keys(dimension).includes("height_unit") )
    return unitToMM(dimension.height_min, dimension.height_unit);
}
/**
 *
 **/
function extractThicknessData(text)
{
  // console.log(text);
  res = text.match(/[E|é]paisseur(?:\s)?(?::\s)?(\d+(?:(?:,|.)\d+)?)\s?(mm|cm)/);
  return {
    'thickness': res[1].replace(".",","),
    'thickness_unit': res[2]
  };
}


function extractDimension(text)
{
  // If the dimension are always the same : 
  res = text.match(/(\d*(?:.|,)?\d+)(?:\s(mm|cm))?\sx\s(\d*(?:.|,)?\d+)\s(mm|cm)/);
  if (res !== null)
  {
    // console.log("Fixed dimension");
    // console.log(res);
    return {
      'width'       : res[1].replace(".",","),
      'width_unit'  : res[2] === undefined ? res[4] : res[2] ,
      'height'      : res[3].replace(".",","),
      'height_unit' : res[4] === undefined ? res[2] : res[4] ,
    };
  }
  // If the dimension can vary
  res = text.match(/(\d+(?:(?:,|.)\d+)?)\sx\s(\d+(?:(?:,|.)\d+)?)\sà\s(\d+(?:(?:,|.)\d+)?)\s(mm|cm)/);
  if (res !== null)
  {
    // console.log("Height can vary");
    // console.log(res);
    return {
      'width'       : res[1].replace(".",","),
      'width_unit'  : res[4],
      'height_min'  : res[2].replace(".",","),
      'height_max'  : res[3].replace(".",","),
      'height_unit' : res[4]
    };
  }
  
  // If both dimension can vary
  res = text.match(/Longueur\s?:\s(?:de\s)?(\d*(?:.|,)?\d+)\sà\s(\d*(?:.|,)?\d+)\s(cm|mm).*Largeur\s?:\sde\s(\d*(?:.|,)?\d+)\sà\s(\d*(?:.|,)?\d+)\s(cm|mm)/);
  if (res !== null)
  {
    // console.log("Both height and width can vary");
    // console.log(res);
    return {
      'width_min'   : res[1],
      'width_max'   : res[2],
      'width_unit'  : res[3] === undefined ? res[6] : res[3] ,
      'height_min'  : res[4],
      'height_max'  : res[5],
      'height_unit' : res[6] === undefined ? res[3] : res[6]
    };
  }
  
  //
  res = text.match(/(\d*(?:.|,)?\d+)\s(cm|mm)\sde\slarge.*Longueur\s:\s(\d*(?:.|,)?\d+)\s(cm|mm)/);
  if (res !== null)
  {
    // console.log("Both height and width can vary");
    // console.log(res);
    return {
      'width'       : res[1].replace(".",","),
      'width_unit'  : res[2] === undefined ? res[4] : res[2] ,
      'height'      : res[3].replace(".",","),
      'height_unit' : res[4] === undefined ? res[2] : res[4]
    };
  }
  alert('Could not extract dimension from : ' + text)
}

/**
 * Returns an array where each entry is a list formatted as follow :
 * { quantity, discount, price }
 */
function extractPrices(product)
{
  var prices = Array();
  product_price = product.querySelector('span.product-price').innerText;
  currency = product.querySelector('[itemprop=priceCurrency]').content;

  // If the product price start with "à partir de" it means 2 things :
  // 1 - we are dealing with the lowest price and not the price for one
  //     unit. So we must calculate the unit price
  // 2 - we will have to do more parsing since TOP WOOD provides an array
  //     of different prices according to the number or unit you buy.
  //     And we will use this array to calculate the price for one unit.
  if (product_price.startsWith('à partir de'))
  {
    entries = product.querySelectorAll('div.quantity_discount tbody > tr');

    for(index_entry = 0; index_entry < entries.length; index_entry++)
    {
      cells = entries[index_entry].querySelectorAll('td');
      prices.push({
        'quantity': cells[0].innerText,
        'discount': cells[1].innerText,
        'price'   : extractPrice(cells[2].innerText),
        'currency': currency,
        'toString' : function(){
          console.log("Unit price for "+this.quantity+" : "+this.price);
        }
      });  
    }
    // Now we compute the price for 1 unit
    product_price = ""+ parseFloat(prices[0].price) / (1 - (parseFloat(prices[0].discount) / 100));
    product_price = product_price.replace('.',',');
  }else{
    product_price = extractPrice(product.querySelector('[itemprop=price]').innerText);
  }
  
  prices.unshift({
    'quantity': 1,
    'discount': "0%",
    'price'   : product_price,
    'currency': currency,
    'toString' : function(){
      console.log("Unit price for "+this.quantity+" : "+this.price);
    }
  });
  
  return prices;
}

function extractPrice(text)
{
  res = text.match(/(\d*(?:.|,)?\d+)/);
  return res[1];
}

/**
 * Converts the given value into millimeter 
 **/
function unitToMM(dimension, unit)
{
  __unit = {
    'mm' : 1,
    'cm' : 10,
    'dm' : 100,
    'm'  : 1000
  };
  return dimension * __unit[unit];
}
