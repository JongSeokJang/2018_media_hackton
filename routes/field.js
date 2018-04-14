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

// Get Field Data
router.get('/', (req, res) =>{

  let startKey      = req.query.startKey;
  let contentType   = 0;

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

  /*
  if( startKey !=  0 ){
    params.ExclusiveStartKey = {
      contentType   : contentType,
      contentID     : startKey
    }
  }
  */
  
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

// Insert Field Data
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

  let userID        = req.body.userID; 
  let content       = req.body.content;
  let category      = req.body.category;

  let contentID     = misc.makeContentID();
  let timeStamp     = misc.getTimeStamp();

  let contentType   = 0;
  let pContentID    = "0";

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
        "content"       : content,
        "likeCount"     : 0,
        "seedCount"     : 0
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

// Update Field Data
router.put('/:fieldID', (req, res) => {

  let contentID     = req.params.fieldID;
  let category      = req.body.category;
  let content       = req.body.content;
  let userID        = req.body.userID;

  let timeStamp     = misc.getTimeStamp();
  let modifyDate    = Math.floor(timeStamp/1000).toString();
  let contentType   = 0;

  let params = {
    TableName : contentTable,
    Key : {
      "contentType" : contentType,
      "contentID"   : contentID
    },
    UpdateExpression : "SET #data.#category = :category, #data.#content = :content",
    ConditionExpression : "#userID = :userID",
    ExpressionAttributeNames : {
      "#data"       : "contentData",
      "#content"    : "content",
      "#category"   : "category",
      "#userID"     : "userID"
    },
    ExpressionAttributeValues : {
      ":category"   : category,
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


// Delete Field Data
router.delete('/:fieldID', (req, res) => {

  let contentID     = req.params.fieldID;
  let userID        = req.headers.userid;

  let contentType   = 0;

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
      res.send( JSON.stringify({"result" : "-1"}) );
    }
    else{
      console.log("Success", data);
      res.send( JSON.stringify({"result" : { "contentID" : contentID }}) );
    }
  });
});


// get Seed Data for fieldID
router.get('/:fieldID/seed/', (req, res) =>{

  let parentID      = req.params.fieldID;
  let startKey      = req.query.startKey;
  let contentType   = req.query.contentType;

  let params = {
    TableName : contentTable,
    IndexName : "parentID-contentID-index",
    KeyConditionExpression : "#pID = :pID and #cID <= :cID",
    ExpressionAttributeNames : {
      "#pID"    : "parentID",
      "#cID"    : "contentID"
    },
    ExpressionAttributeValues : {
      ":pID"    : parentID,
      ":cID"    : "~"
    },
    Limit : 100
  };

  /*
  if( startKey !=  0 ){
    params.ExclusiveStartKey = {
      parentID      : parentID,
      contentID     : startKey,
      contentType   : contentType
    }
  }
  */
  
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


// Insert Seed Data
router.post('/:fieldID/seed/', (req, res) =>{

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

  let pContentID    = req.params.fieldID;
  let contentType   = req.body.contentType;
  let position      = req.body.position;

  let userID        = req.body.userID; 
  let content       = req.body.content;

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

      // Update field's seed Count

      let params_seedCount = {
        TableName : contentTable,
        Key : {
          "contentType" : 0,
          "contentID"   : pContentID
        },
        UpdateExpression : "SET #Data.#sCount = #Data.#sCount + :cnt",
        ExpressionAttributeNames : {
          "#Data"   : "contentData",
          "#sCount" : "seedCount"
        },
        ExpressionAttributeValues : {
          ":cnt"    : 1
        }
      }

      docClient.update(params_seedCount, (err, data) =>{

        if( err ){
          console.log("Err", err);
          res.send( JSON.stringify({"result" : "-2"}) );
        }
        else{
          console.log("Success", data);
          res.send( JSON.stringify({"result" : {"contentID" : contentID}}) );
        }
      });
    }
  });
});


// Update Seed Data
router.put('/:fieldID/seed/:seedID', (req, res) => {

  let pContentID    = req.params.fieldID;
  let contentID     = req.params.seedID;

  let contentType   = req.body.contentType;
  let position      = req.body.position;
  let content       = req.body.content;
  
  let userID        = req.body.userID;

  let timeStamp     = misc.getTimeStamp();
  let modifyDate    = Math.floor(timeStamp/1000).toString();

  let params = {
    TableName : contentTable,
    Key : {
      "contentType" : contentType,
      "contentID"   : contentID
    },
    UpdateExpression : "SET #data.#content = :content, #data.#position = :position, #date.#mDate = :mDate",
    ConditionExpression : "#userID = :userID",
    ExpressionAttributeNames : {
      "#data"       : "contentData",
      "#content"    : "content",
      "#position"   : "position",
      "#userID"     : "userID",
      "#date"       : "Date",
      "#mDate"      : "modifyDate"
    },
    ExpressionAttributeValues : {
      ":position"   : position,
      ":content"    : content,
      ":userID"     : userID,
      ":mDate"      : modifyDate
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


// Delete Seed Data
router.delete('/:fieldID/seed/:seedID', (req, res) => {

  let pCountentID   = req.params.fieldID;
  let contentID     = req.params.seedID;

  let userID        = req.headers.userid;
  let contentType   = parseInt(req.headers.seedtype);

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

  console.log(params);
  
  docClient.delete(params, (err, data) =>{
    if( err ){
      console.log("err", err);
      res.send( JSON.stringify({"result" : "-1"}) );
    }
    else{

      let params_seedCount = {
        TableName : contentTable,
        Key : {
          "contentType" : 0,
          "contentID"   : pCountentID
        },
        UpdateExpression : "SET #Data.#sCount = #Data.#sCount + :cnt",
        ExpressionAttributeNames : {
          "#Data"   : "contentData",
          "#sCount" : "seedCount"
        },
        ExpressionAttributeValues : {
          ":cnt"    : -1
        }
      }

      docClient.update(params_seedCount, (err, data) =>{

        if( err ){
          console.log("Err", err);
          res.send( JSON.stringify({"result" : "-2"}) );
        }
        else{
          console.log("Success", data);
          res.send( JSON.stringify({"result" : {"contentID" : contentID}}) );
        }
      });
    }
  });
});


router.post('/:fieldID/seed/:seedID/like', (req, res) =>{

  let fieldID       = req.params.fieldID;
  let contentID     = req.params.seedID;


  let contentType   = req.body.seedType;
  let userID        = req.body.userID;


  let params = {
    TableName : likeTable,
    Item : {
      "userID"      : userID,
      "contentType" : contentType,
      "seedID"      : seedID
    },
    ReturnValues  : "ALL_OLD"
  }

  docClient.put(params, (err, data) =>{
    if( err ){
      console.log("Err" , err);
      res.send(JSON.stringify({"result" : " -1"}));
    }
    else{
      // update Count
      
      if( data.Attributes != undefined ){
        res.send(JSON.stringify({"result" : " -2"}));
      }
      else{

        let params_likeCount = {
          TableName : contentTable,
          Key : {
            "contentType" : contentType,
            "contentID"   : contentID
          },
          UpdateExpression : "SET #Data.#lCount = #Data.#lCount + :cnt",
          ExpressionAttributeNames : {
            "#Data"   : "contentData",
            "#cCount" : "likeCount"
          },
          ExpressionAttributeValues : {
            ":cnt"    : 1
          }
        }

        docClient.update(params_likeCount, (err, data) =>{
          if( err ){
            console.log("Err" , err);
            res.send(JSON.stringify({"result" : " -2"}));
          }
          else{
            console.log("Success", data);
            res.send(JSON.stringify({"result" : " 1"}));
          }
        });
      }
    }
  });

});

router.post('/:fieldID/seed/:seedID/dislike', (req, res) =>{

  let fieldID       = req.params.fieldID;
  let contentID     = req.params.seedID;

  let contentType   = req.body.seedType;
  let userID        = req.body.userID;


  let params = {
    TableName : likeTable,
    Key : {
      "userID"      : userID,
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
      console.log("Err" , err);
      res.send(JSON.stringify({"result" : " -1"}));
    }
    else{
      // update Count

      let params_likeCount = {
        TableName : contentTable,
        Key : {
          "contentType" : contentType,
          "contentID"   : contentID
        },
        UpdateExpression : "SET #Data.#lCount = #Data.#lCount + :cnt",
        ExpressionAttributeNames : {
          "#Data"   : "contentData",
          "#cCount" : "likeCount"
        },
        ExpressionAttributeValues : {
          ":cnt"    : -1
        }
      }

      docClient.update(params_likeCount, (err, data) =>{
        if( err ){
          console.log("Err" , err);
          res.send(JSON.stringify({"result" : " -2"}));
        }
        else{
          console.log("Success", data);
          res.send(JSON.stringify({"result" : " 1"}));
        }
      });
    }
  });

  
});

// get Seed's comment
router.get('/:fieldID/seed/:seedID/comment', (req, res) =>{
  
  let fieldID       = req.params.fieldID;
  let seedID        = req.params.seedID;    // this is parentID

  let contentType   = 4

  let params = {
    TableName : contentTable,
    IndexName : "parentID-contentID-index",
    KeyConditionExpression : "#pID = :pID and #cID <= :cID",
    ExpressionAttributeNames : {
      "#pID"    : "parentID",
      "#cID"    : "contentID"
    },
    ExpressionAttributeValues : {
      ":pID"    : seedID,
      ":cID"    : "~"
    },
    Limit : 100
  };

  docClient.query(params, (err, data) =>{
    if( err ){
      console.log(err);
      res.send( JSON.stringify({"result" : " -1"}) );
    }
    else{
      console.log(data);
      res.send( JSON.stringify(data) );
    }
  });

});


// Insert Seed's comment
router.post('/:fieldID/seed/:seedID/comment', (req, res) =>{

  let pContentID    = req.params.seedID;
  let pContentType  = req.body.seedType;

  let userID        = req.body.userID; 
  let content       = req.body.content;

  let contentID     = misc.makeContentID();
  let timeStamp     = misc.getTimeStamp();

  let contentType   = 4;

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
        "content"       : content,
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

      // Update field's seed Count

      let params_commentCount = {
        TableName : contentTable,
        Key : {
          "contentType" : pContentType,
          "contentID"   : pContentID
        },
        UpdateExpression : "SET #Data.#cCount = #Data.#cCount + :cnt",
        ExpressionAttributeNames : {
          "#Data"   : "contentData",
          "#cCount" : "commentCount"
        },
        ExpressionAttributeValues : {
          ":cnt"    : 1
        }
      }

      docClient.update(params_commentCount, (err, data) =>{
        if( err ){
          console.log("err", err);
          res.send( JSON.stringify({"result" : "-2"}) );
        }
        else{
          console.log("Success", data);
          res.send( JSON.stringify({"result" : {"contentID" : contentID}}) );

        }
      });
    }

  });
});


// update Seed's comment
router.put('/:fieldID/seed/:seedID/comment/:commentID', (req, res) =>{

  let contentID     = req.params.commentID;
  
  let userID        = req.body.userID;
  let content       = req.body.content;

  let timeStamp     = misc.getTimeStamp();
  let modifyDate    = Math.floor(timeStamp/1000).toString();
  let contentType   = 4;

  let params = {
    TableName : contentTable,
    Key : {
      "contentType" : contentType,
      "contentID"   : contentID
    },
    UpdateExpression : "SET #data.#content = :content, #date.#mDate = :mDate",
    ConditionExpression : "#userID = :userID",
    ExpressionAttributeNames : {
      "#data"       : "contentData",
      "#date"       : "Date",
      "#mDate"      : "modifyDate",
      "#content"    : "content",
      "#userID"     : "userID"
    },
    ExpressionAttributeValues : {
    
      ":mDate"      : modifyDate,
      ":content"    : content,
      ":userID"     : userID
    }
  }

  console.log(params);
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

// delete Seed's comment
router.delete('/:fieldID/seed/:seedID/comment/:commentID', (req, res) =>{

  let contentID     = req.params.commentID;
  let pContentID    = req.params.seedID;
  let pContentType  = parseInt(req.headers.seedtype);

  let userID        = req.headers.userid;
  let contentType   = 4;

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

      let params_seedCount = {
        TableName : contentTable,
        Key : {
          "contentType" : pContentType,
          "contentID"   : pContentID
        },
        UpdateExpression : "SET #Data.#cCount = #Data.#cCount + :cnt",
        ExpressionAttributeNames : {
          "#Data"   : "contentData",
          "#cCount" : "commentCount"
        },
        ExpressionAttributeValues : {
          ":cnt"    : -1
        }
      }

      docClient.update(params_seedCount, (err, data) =>{

        if( err ){
          console.log("Err", err);
          res.send( JSON.stringify({"result" : "-2"}) );
        }
        else{
          console.log("Success", data);
          res.send( JSON.stringify({"result" : {"contentID" : contentID}}) );
        }
      });
    }
  });
});


/*
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

*/





module.exports = router;
