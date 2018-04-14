const express   = require('express');
const AWS       = require('aws-sdk');
const async     = require('async');
const misc      = require('../lib/misc');

const router = express.Router();

AWS.config.update({
  region : 'ap-northeast-2',
  accessKeyId: 'AKIAJT7ABYJ6PIS3U7ZA',
  secretAccessKey: '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'
});

const docClient = new AWS.DynamoDB.DocumentClient({
  endpoint : "dynamodb.ap-northeast-2.amazonaws.com"
});

const contentTable  = "contentTable";
const likeTable     = "likeTable";

/* GET home page. */
router.get('/', (req, res) =>{

  let startKey      = req.query.startKey;
  let contentType   = 1;
  let timeStamp     = misc.getTimeStamp().toString();

  let params = {
    TableName : contentTable,
    KeyConditionExpression : "#type = :type and #cID <= :cID",
    ExpressionAttributeNames : {
      "#type"   : "contentType",
      "#cID"    : "contentID"
    },
    ExpressionAttributeValues : {
      ":type"   : contentType,
      ":cID"    : "~"
    },
    Limit : 50
  };

  
  if( startKey !=  0){
    params.ExclusiveStartKey = {
      contentType   : contentType,
      contentID     : startKey
    }
  }
  

  console.log(params);
  docClient.query(params, (err, data) =>{
    if(err){
      console.log("err", err);
      res.send( JSON.stringify({"result":"-1"}) );
    }
    else{
      console.log("data", data);
      res.send( JSON.stringify(data) );
    }
  });
});

router.post('/', (req, res) =>{

  /*
   * contentType :  0 // 새로만든 판
   *                1 // 해당 판에 관련된 데이터    
   *                2 // 해당 판에 대한 찬성의견
   *                3 // 해당 판에 대한 반대의견
   *
   * contentID   :  xxxxxxxx // 
   * pContentID  :  0       // 판일 경우
   *             :  xxxxxx  // 판에 관한 데이터, 찬성의견, 반대의견인 경우 판의 ID
   * position    :  [x, y]  // 판에 저장된 좌표정보
   * userID      :  해당 판 또는 게시글 작성자 ID
   * category    :  content 카테고리
   * content     :  content
   *
   *
   * A
   *
   */

  let contentType   = req.body.contentType;
  let userID        = req.body.userID; 
  let content       = req.body.content;
  let category      = req.body.category;
  let position      = req.body.position;
  let pContentID    = req.body.pContentID;

  let contentID     = misc.makeContentID();
  let timeStamp     = misc.getTimeStamp();


  let initDate;
  let modifyDate;
  initDate = modifyDate = Math.floor(timeStamp/1000).toString();

  let params = {
    TableName : contentTable,
    Item : {
      "contentType" : contentType,      // primary Key
      "contentID"   : contentID,        // sort Key
      "parentID"    : pContentID,
      "userID"      : userID,
      "contentData" :{
        "category"      : category,
        "position"      : position,
        "content"       : content,
        "likeCount"     : 0,
        "commentCount"  : 0
      },
      "Date" : {
        "initDate"      : initDate,
        "modifyDate"    : modifyDate
      }
    }
  }

  docClient.put(params, (err, data) =>{
    if(err){
      console.log("Err", err);
      res.send( JSON.stringify({"result" : "-1"}) );
    }
    else{
      console.log("Success", data);
      res.send( JSON.stringify({"result" : {"contentID" : contentID}}) );
    }
  });

});

router.put('/:contentID', (req, res) => {

  let contentID     = req.params.contentID;
  let category      = req.body.category;
  let position      = req.body.position;
  let content       = req.body.content;
  let userID        = req.body.userID;

  let timeStamp     = misc.getTimeStamp();
  let modifyDate    = Math.floor(timeStamp/1000).toString();
  let contentType   = 1;

  let params = {
    TableName : contentTable,
    Key : {
      "contentType" : contentType,
      "contentID"   : contentID
    },
    UpdateExpression : "SET #data.#category = :category, #data.#content = :content, #data.#positon = :position",
    ConditionExpression : "#userID = :userID",
    ExpressionAttributeNames : {
      "#data"       : "contentData",
      "#content"    : "content",
      "#category"   : "category",
      "#position"   : "position",
      "#userID"     : "userID"
    },
    ExpressionAttributeValues : {
      ":category"   : category,
      ":position"   : position,
      ":content"    : content,
      ":userID"     : userID
    }
  }

  docClient.update(params, (err, data) =>{
    if( err ){
      console.log("err", err);
      res.send( JSON.stringify({"result" : "-1"}) );
    }
    else{
      console.log("Success", data);
      res.send( JSON.stringify({"result" : {"contentID" : contentID}}) );
    }
  });

});

router.delete('/:contentID', (req, res) => {

  let contentID     = req.params.contentID;
  let userID        = req.headers.userid;

  let contentType   = 1;

  let params = {
    TableName : contentTable,
    Key : {
      "contentType" : contentType,
      "contentID"   : contentID
    },
    ConditionExpression : "#userID = :userID",
    ExpressionAttributeNames : {
      "#userID"     : "userID"
    },
    ExpressionAttributeValues : {
      ":userID"     : userID
    }
  }

  docClient.delete(params, (err, data) =>{
    if( err ){
      console.log("err", err);
      req.send( JSON.stringify({"result" : "-1"}) );
    }
    else{
      console.log("Success", data);
      req.send( JSON.stringify({"result" : { "contentID" : contentID }}) );
    }
  });
});

// 댓글 가져오기
router.get('/:contentID/comment', (req, res) =>{


});

// 댓글 쓰기 
router.post('/:contentID/comment', (req, res) => {

});

// 댓글 수정하기
router.put('/:contentID/comment/:commentID', (req, res) =>{

});

// 댓글 삭제하기
router.delete('/:contentID/comment/:commentID', (req, res) => {

});

// 좋아요 하기
router.post('/:contentID/like', (req, res) =>{

  let contentID     = req.params.contentID;
  let userID        = req.body.userID;

  let timeStamp     = misc.getTimeStamp();
  let likeDate      = Math.floor(timeStamp/1000).toString();

  let contentType   = 1;

  let params_likeInfo = {
    TableName : likeTable,
    Item : {
      "contentID"   : contentID,
      "userID"      : userID,
      "likeDate"    : likeDate
    },
    ReturnValues : "ALL_OLD"
  };

  docClient.put(params_likeInfo, (err, data) =>{
    if( err ){
      console.log("Err", err);
      res.send( JSON.stringify( {"result" : "-1"}) );
    }
    else{
      // 기존에 좋아요한 기록이 있을경우 count 를 키우지 않는다
      if( data.Attributes != undefined ){
        res.send( JSON.stringify( {"result" : "-2"}) );
      }
      else{

        let params_likeCount = {
          TableName : contentTable,
          Key : {
            "contentType"   : contentType,
            "contentID"     : contentID
          },
          UpdateExpression : "SET #data.#likeCount = #data.#likeCount + :likeCount",
          ExpressionAttributeNames : {
            "#data"         : "contentData",
            "#likeCount"    : "likeCount"
          },
          ExpressionAttributeValues : {
            ":likeCount"    : 1
          }
        };

        docClient.update( params_likeCount, (err, data) =>{
          if( err ){
            console.log("Err", err);
            res.send( JSON.stringify( {"result" : "-3"}) );
          }
          else{
            res.send( JSON.stringify( {"result" : "1"}) );
          }
        });

      }
    }

  });

});

// 좋아요 취소하기
router.delete('/:contentID/like', (req, res) =>{

  let contentID     = req.params.contentID;
  let userID        = req.headers.userid;

  let params = {
    TableName : likeTable,
    Key : {
      "contentID"   : contentID,
      "userID"      : userID,
    },
    ConditionExpression : "#userID = :userID",
    ExpressionAttributeNames :{
      "#userID" : "userID"
    },
    ExpressionAttributeValues : {
      ":userID" : userID
    }
  };

  docClient.delete(params, (err, data) =>{
    if( err ){
      console.log("Err", err);
      res.send( JSON.stringify( {"result" : "-1"}) );
    }
    else{

      let params_likeCount = {
        TableName : contentTable,
        Key : {
          "contentType"   : contentType,
          "contentID"     : contentID
        },
        UpdateExpression : "SET #data.#likeCount = #data.#likeCount + :likeCount",
        ExpressionAttributeNames : {
          "#data"         : "contentData",
          "#likeCount"    : "likeCount"
        },
        ExpressionAttributeValues : {
          ":likeCount"    : -1
        }
      };

      docClient.update( params_likeCount, (err, data) =>{
        if( err ){
          console.log("Err", err);
          res.send( JSON.stringify( {"result" : "-3"}) );
        }
        else{
          res.send( JSON.stringify( {"result" : "1"}) );
        }
      });

    }
  });

});






module.exports = router;
