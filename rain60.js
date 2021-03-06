$(function() {
  var BASE_URL = 'http://aramoto.sakura.ne.jp/shizuoka2/'
  var MAP_WIDTH = 900, MAP_HEIGHT = 650;

  var map = d3.select('#map')
    .append('svg').attr({
      width: MAP_WIDTH, height: MAP_HEIGHT
    });

  var tooltip = d3.select('#tooltip');

  d3.json(BASE_URL+'/gis/shizuoka_utf8.json', function(json) { // 静岡県地図データ
    drawMap(json);
    d3.csv(BASE_URL+'Shizuoka_Rain_ObservationPoint_utf8.csv', // 雨量観測局情報
      function(error, rows) {
        drawRainPoints(rows);
        loadRainData();
      });
  });

  function drawMap(json) {
    map.projection = d3.geo.mercator()
      .scale(15000)
      .center(d3.geo.centroid(json))
      .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);
    var path = d3.geo.path().projection(map.projection);

    map.selectAll('path')
      .data(json.features)
      .enter()
      .append('path')
        .attr({
          d: path
        })
        .style({
          fill: 'hsl(0,0%,80%)',
          stroke: 'hsl(80,100%,0%)'
        });
  }

  function drawRainPoints(data) {
    var points = map.selectAll('.rain-point')
      .data(data).enter()
      .append('g')
      .attr({
        id: function(d) {
          return 'rp_' + d.point_id;
        },
        class: 'rain-point',
        transform: function(d) {
          var pos = map.projection([d.longitude/10000, d.latitude/10000]);
          return 'translate(' + pos[0] + ',' + pos[1] + ')';
        }
      });

    points.append('circle')
      .attr({
        class: 'node',
        r: 5
      })
      .style({
        stroke: '#000',
        fill: '#fff'
      });

    points
      .on('mouseover', showTooltip)
      .on('mouseout', hideTooltip);
  }

  function showTooltip(d) {
    d.values = d.values || {}
    tooltip.select('.name').text(d.pointname);
    tooltip.select('.address').text(d.address || '--');
    tooltip.select('.rain10').text(d.values.rain_10min || '--');
    tooltip.select('.rain60').text(d.values.rain_60min || '--');
    tooltip.style({
      top: d3.event.pageY + 'px',
      left: d3.event.pageX + 'px',
      display: 'block'
    });
  }

  function hideTooltip() {
    tooltip.style({ display: 'none' });
  }


  function loadRainData() {
    var datetime = getDatetime(),
        date = datetime[0].split('-').join(''),
        time = datetime[1].replace(':', '').substring(0, 3) + '0'
    console.log(date, time);

    var date = $(':input[name=date]').val().split('-').join('');
    var time = $(':input[name=time]').val().replace(':', '');

    d3.csv(BASE_URL+'Rain/' + date + '/' + time + '.csv',
      function(error, rows) {
        if (error) {
          clearInterval(timer);
          return;
        }

        var hash = {}
        $.each(rows, function(i, val) {
          hash[val.point_id] = val;
        });
        showRainData(hash);
      });
  }

  function showRainData(data) {
    map.selectAll('.rain-point')
      .datum(function(d) { // 雨量観測局データに雨量をマージする
        d.values = data[d.point_id] || {}
        return d;
      })
      .select('circle')
        .style({
          stroke: '#000',
          fill: function(d) {
            var rain = d.values[datatype];
            if (rain === undefined
                || rain == 0
                || rain == '-1111111111'
                || rain == '9999') {
              return '#fff';
            } else {
              rain = Math.max(0, Math.floor(255 - rain * 2));
              return 'rgb(' + rain + ',' + rain + ',255)';
            }
          }
        });
  }


  var datatype;
  $('select[name=datatype]').change(function() {
    datatype = $(this).val();
  }).change();


  var $date = $(':input[name=date]'),
      $time = $(':input[name=time]');

  $date.initialValue = $date.val();
  $time.initialValue = $time.val();

  function getDatetime() {
    var date = $date.val() || $date.initialValue;
    var time = $time.val() || $time.initialValue;
    $date.val(date);
    time = time.substring(0, 4) + '0';
    $time.val(time);
    return [ date, time ];
  }

  $(':input[name=load]').click(function(event) {
    event.preventDefault();
    loadRainData();
  });


  var timer;

  $(':input[name=play]').click(function(event) {
    event.preventDefault();
    $('.player').toggle('hidden');

    timer = setInterval(function() {
      var datetime = new Date(getDatetime().join(' '))
      datetime.setMinutes(datetime.getMinutes() + 10);
      $date.val(formatDate(datetime));
      $time.val(datetime.toTimeString().substring(0,5));
      loadRainData();
    }, 500);
  });

  function formatDate(date) {
    var year = date.getFullYear(),
        month = date.getMonth() + 1,
        day = date.getDate();
    if (month < 10) {
      month = '0' + month;
    }
    if (day < 10) {
      day = '0' + day;
    }
    return year + '-' + month + '-' + day;
  }

  $(':input[name=stop]').click(function(event) {
    event.preventDefault();
    clearInterval(timer);
    $('.player').toggle('hidden');
  });
});
