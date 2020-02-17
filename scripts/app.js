(function() {
  "use strict";

  var app = {
    isLoading: true,
    visibleCards: {},
    cacheCards: {},
    selectedTimetables: [],
    spinner: document.querySelector(".loader"),
    cardTemplate: document.querySelector(".cardTemplate"),
    container: document.querySelector(".main"),
    addDialog: document.querySelector(".dialog-container")
  };

  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/

  document.getElementById("butRefresh").addEventListener("click", function() {
    // Refresh all of the metro stations
    app.updateSchedules();
  });

  document.getElementById("butAdd").addEventListener("click", function() {
    // Open/show the add new station dialog
    app.toggleAddDialog(true);
  });

  document.getElementById("butAddCity").addEventListener("click", function() {
    var select = document.getElementById("selectTimetableToAdd");
    var selected = select.options[select.selectedIndex];
    var key = selected.value;
    var label = selected.textContent;
    if (!app.selectedTimetables) {
      app.selectedTimetables = [];
    }
    app.toggleAddDialog(false);

    // Save the updated list of selected cities.
    app.cacheCards[key] = { key: key, label: label };
    saveLocationDirections(app.cacheCards);
    updateDataDestinations();
  });

  document.getElementById("butAddCancel").addEventListener("click", function() {
    // Close the add new station dialog
    app.toggleAddDialog(false);
  });

  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/
  // Method to add to cache values
  function saveLocationDirections(locations) {
    const data = JSON.stringify(locations);
    localStorage.setItem("directionList", data);
  }

  // Method to get data from cache
  function loadLocationList() {
    let locations = localStorage.getItem("directionList");
    if (locations) {
      try {
        locations = JSON.parse(locations);
      } catch (ex) {
        locations = {};
      }
    }
    if (!locations || Object.keys(locations).length === 0) {
      const key = "metros/1/bastille/A";
      locations = {};
      locations[key] = { label: "No service right now" };
    }
    return locations;
  }

  // Toggles the visibility of the add new station dialog.
  app.toggleAddDialog = function(visible) {
    if (visible) {
      app.addDialog.classList.add("dialog-container--visible");
    } else {
      app.addDialog.classList.remove("dialog-container--visible");
    }
  };

  /*  //Method to get from the cache and updted the time card table
    app.getfromcache = function(){
      var resp= loadLocationList();
      //app.visibleCards = resp;
      console.log(resp);
    }*/

  //Method to updated when is something in the cache
  function updateDataDestinations() {
    Object.keys(app.cacheCards).forEach(key => {
      const destination = app.cacheCards[key];
      app.getSchedule(destination.key, destination.label);
      app.selectedTimetables.push({
        key: destination.key,
        label: destination.label
      });
    });
  }

  // Updates a timestation card with the latest weather forecast. If the card
  // doesn't already exist, it's cloned from the template.

  app.updateTimetableCard = function(data) {
    var key = data.key;
    var dataLastUpdated = new Date(data.created);
    var schedules = data.schedules;
    var card = app.visibleCards[key];
    if (!card) {
      var label = data.label.split(", ");
      var title = label[0];
      var subtitle = label[1];
      card = app.cardTemplate.cloneNode(true);
      card.classList.remove("cardTemplate");
      card.querySelector(".label").textContent = title;
      card.querySelector(".subtitle").textContent = subtitle;
      card.removeAttribute("hidden");
      app.container.appendChild(card);
      app.visibleCards[key] = card;
    }
    card.querySelector(".card-last-updated").textContent = data.created;

    var scheduleUIs = card.querySelectorAll(".schedule");
    for (var i = 0; i < 4; i++) {
      var schedule = schedules[i];
      var scheduleUI = scheduleUIs[i];
      if (schedule && scheduleUI) {
        scheduleUI.querySelector(".message").textContent = schedule.message;
      }
    }

    if (app.isLoading) {
      app.spinner.setAttribute("hidden", true);
      app.container.removeAttribute("hidden");
      app.isLoading = false;
    }
  };

  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  app.getSchedule = function(key, label) {
    console.log(key);
    console.log(label);
    // console.log(key);
    // console.log(label);
    window.performance.mark("mark_start");
    var url = "https://api-ratp.pierre-grimaud.fr/v3/schedules/" + key;

    var reqCnt = 0;
    var request = new XMLHttpRequest();

    request.onreadystatechange = function() {
      reqCnt++;
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          if (app.selectedTimetables == []) {
          }
          var response = JSON.parse(request.response);
          var result = {};
          result.key = key;
          result.label = label;
          result.created = response._metadata.date;
          result.schedules = response.result.schedules;
          app.updateTimetableCard(result);
        }
      } else {
        // Return the initial weather forecast since no data is available.
        app.updateTimetableCard(initialStationTimetable);
      }
    };
    request.open("GET", url);
    request.send();
    window.performance.mark("mark_end");
    if (reqCnt == 1) {
      window.performance.measure("mark_test", "mark_start", "mark_end");
      var items = window.performance.getEntriesByType("measure");
      window.cardLoadTime = items[0].duration;
    }
  };

  // Iterate all of the cards and attempt to get the latest timetable data
  app.updateSchedules = function() {
    var keys = Object.keys(app.visibleCards);
    keys.forEach(function(key) {
      app.getSchedule(key);
    });
  };

  /*
   * Fake timetable data that is presented when the user first uses the app,
   * or when the user has not saved any stations. See startup code for more
   * discussion.
   */

  var initialStationTimetable = {
    key: "metros/1/bastille/A",
    label: "Bastille, Direction La Défense",
    created: "2017-07-18T17:08:42+02:00",
    schedules: [
      {
        message: "0 mn"
      },
      {
        message: "2 mn"
      },
      {
        message: "5 mn"
      }
    ]
  };

  /************************************************************************
   *
   * Code required to start the app
   *
   * NOTE: To simplify this codelab, we've used localStorage.
   *   localStorage is a synchronous API and has serious performance
   *   implications. It should not be used in production applications!
   *   Instead, check out IDB (https://www.npmjs.com/package/idb) or
   *   SimpleDB (https://gist.github.com/inexorabletash/c8069c042b734519680c)
   ************************************************************************/

  app.getSchedule("metros/1/bastille/A", "Bastille, Direction La Défense");
  app.selectedTimetables = [
    { key: initialStationTimetable.key, label: initialStationTimetable.label }
  ];
  var cacheItems = JSON.parse(localStorage.getItem("directionList"));
  if (cacheItems != null) {
    Object.values(cacheItems).forEach(values => {
      
      app.getSchedule(values.key, values.label);
      app.selectedTimetables.push({
        key: values.key,
        label: values.label
      });
    });
  }
})();
