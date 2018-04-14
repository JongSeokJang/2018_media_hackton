// misc.js

module.exports = {

  getTimeStamp: (date) => {
    var date = new Date();
    var milliseconds = date.getTime();
    return milliseconds;
  },
  makeContentID: () => {
    const bigNumber = 9999999999999
    const max = 999
    const min = 100

    let date = new Date();
    let timeStamp = date.getTime();
    let randomNum = Math.floor(Math.random() * (max - min)) + min;

    console.log(bigNumber)
    console.log(timeStamp);
    let contentID = (bigNumber-timeStamp).toString() + randomNum;
    return contentID
  },
  extractURL: (prevInfo) => {
    let link_url = prevInfo.link.split("://");
    let temp;

     if(link_url[1].substr(link_url[1].length -1) == '/'){
      temp = link_url[1].slice(0,-1);
    }
    else{
      temp = link_url[1];
    }
    temp = temp.replace(/\//g,"_");
    console.log("In function", temp);
    return temp;
  }
};


