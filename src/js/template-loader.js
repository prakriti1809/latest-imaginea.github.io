var mainModule = (function(){
    var homeListKeys = ["mViewer", "uvCharts", "KodeBeagle"];
    var allProjectKeys = [];
    var dataArray = [];
    
    function getProjectsData() {
        showLoader();
        loadAllProjects();
    }

    function loadAllProjects() {
        var listJsonStr = sessionStorage.getItem('projectsList');
        var projectsList = [];
        if(listJsonStr && listJsonStr.length) {
            projectsList = JSON.parse(sessionStorage.getItem('projectsList'));
        }
        
        if(!projectsList.length) {
            var requestUrl = 'https://api.github.com/orgs/Imaginea/repos';
            getJsonResponse(requestUrl, function projectsListSuccess(projectsList) {
                if(projectsList.documentation_url !== 'https://developer.github.com/v3/#rate-limiting') {
                    hideLoader();
                    sessionStorage.setItem('projectsList', JSON.stringify(projectsList));
                    buildProjectHomePage(projectsList);
                    buildProjectsListPage(projectsList);
                }
            }, function(error) {
                hideLoader(); // show alert to the user about the failure in fetching data
            });
        } else {
            buildProjectHomePage(projectsList);
            buildProjectsListPage(projectsList);
        }
    }

    function buildProjectHomePage(projectsList) {
        dataArray = projectsList.filter(function(product, index) {
            if($.inArray(product.name, homeListKeys) !== -1) {
                return product;
            }
        }).map(function(product, index) {
            return buildProjectCard(product, 'homePage');
        });
        hideLoader();
        $(".header-container, .article").addClass('show');
        var homeTmpl = $.templates('#project-card-tmpl');
        $('#home-list').html(homeTmpl.render(dataArray));
        registerEvents();
    }

    function buildProjectCard(project, view) {
        var projectId = project.name,
        projectDescription = project.description,
        projectCreationDate = project.created_at && new Date(project.created_at).toDateString().substr(4),
        projectUpdateDate = project.pushed_at && new Date(project.pushed_at).toDateString().substr(4),
        projectWatchers = project.watchers,
        projectLanguage = project.language,
        projectGitHubUrl = project.html_url,
        projectHomePageUrl = project.homepage;

        var bgcolor = '#fffff';
        if(view !== 'listPage') {
            bgcolor = '#009DE6';
            if(projectId === 'mViewer') {
                bgcolor = '#6215CD';
            } else if(projectId === 'uvCharts') {
                bgcolor = '#FC8E18';
            } else if(projectId === 'KodeBeagle') {
                bgcolor = '#B51A62';
            } 
        }


        function getFeaturedProjectIcon() {
            switch(projectId) {
                case 'mViewer':
                    return 'assets/images/mViewer-project-icon.png';
                case 'uvCharts':
                    return 'assets/images/uvCharts-project-icon.png';
                case 'KodeBeagle':
                    return 'assets/images/kodebeagle-project-icon.png';
                default:
                    return '';
            }
        }

        function getProjectLogo() {
            switch (projectId) {
                case 'mViewer':
                    return 'assets/images/mViewer-logo.png';
                case 'uvCharts':
                    return 'assets/images/uvCharts-logo.png';
                case 'KodeBeagle':
                    return 'assets/images/kodebeagle-logo.png';
                default:
                    return '';
            }
        }

        function showProjectLogo() {
            if(homeListKeys.indexOf(projectId) > -1) {
                return "show";
            }
            return "hide";
        }
        
        return {
            projectIcon: getFeaturedProjectIcon(),
            showProjectLogo: showProjectLogo(),
            projectLogo: getProjectLogo(),
            name: projectId,
            bgcolor: bgcolor,
            description: projectDescription,
            creationDate: projectCreationDate,
            updateDate: projectUpdateDate,
            watchers: projectWatchers,
            language: projectLanguage,
            gitHubUrl: projectGitHubUrl,
            homePageUrl: projectHomePageUrl
        };
    }

    function buildProjectsListPage(projectsList) {
        var projectsListData = projectsList.map(function(project, index) {
            allProjectKeys.push(project.name);
            return buildProjectCard(project, 'listPage');
        });
        var projectsListTmpl = $.templates('#project-card-tmpl');
        $('#all-project-list').html(projectsListTmpl.render(projectsListData));
        var uniqueList = {};
        for( var i in projectsList ){
            if(projectsList[i].language && typeof(uniqueList[projectsList[i].language]) === "undefined"){
                $('#projects-filter').append($('<option>', { 
                    value: projectsList[i].language,
                    text : projectsList[i].language 
                }));
            }
            uniqueList[projectsList[i].language] = 'inList';
        }
        getProjectDownloadStats(allProjectKeys);

        $('#projects-filter').change(function () {
            var selectedLang = $(this).val();
            var projectCards = $('#all-project-list').find('.project-card-tmpl.section');
            if(selectedLang === '') {
                projectCards.each(function() {
                    $(this).show();
                });
            } else {
                projectCards.each(function() {
                    var $this = $(this);
                    if($this.find('.language').text() !== selectedLang) {
                        $this.hide();
                    } else {
                        $this.show();
                    }
                });
            }
        });
    }

    function getDownloadData(requestUrl) {
        return  $.ajax({
            url: requestUrl,
            dataType: 'jsonp',
            success: function (resp) {
                return resp.data;
            }
        });
    }

    function getProjectDownloadStats(projectKeys) {
        var projectsDownloadList = [];
        var jsonStr = sessionStorage.getItem('projectsDownloadList');
        if(jsonStr && jsonStr.length) {
            projectsDownloadList = JSON.parse(sessionStorage.getItem('projectsDownloadList'));
        }
        
        if(!projectsDownloadList.length) {
            var promises = $.map(projectKeys, function (projectKey, index) {
                var downloadCountUrl = "https://api.github.com/repos/Imaginea/" + projectKey + "/downloads";
                return getDownloadData(downloadCountUrl);
            });

            $.when.apply($, promises).then(function() {
                for(var i = 0; i < arguments.length; i++) {
                    var downlaodObj = {};
                    downlaodObj[projectKeys[i]] = arguments[i][0].data;
                    projectsDownloadList.push(downlaodObj);
                    if(projectsDownloadList.length === arguments.length) {
                    	populateDownloadCount(projectsDownloadList);
                    }
                }
            });
        } else {
            populateDownloadCount(projectsDownloadList);
        }
    }

    function populateDownloadCount(downloadaList) {
        sessionStorage.setItem('projectsDownloadList', JSON.stringify(downloadaList));
        downloadaList.map(function(downloadData, index) {
            Object.keys(downloadData).forEach(function(key) {
                var downloadStatsObj = {};
                var data = downloadData[key];
                switch(data.length) {
                    case 0:
                        downloadStatsObj[key] = {
                            "download_count": 'NA',
                            "download_url": ""
                        };
                        downloadStatsObj["FireFlow"] = { "download_count": 24448, "download_url": "https://addons.mozilla.org/en-US/firefox/addon/fireflow/statistics/?last=30"	};
                        downloadStatsObj["pancake-ios"] = { "download_count": 487, "download_url": "http://itunes.apple.com/us/app/sugar-on-pancake/id528250369?mt=8"};
                        break;
                    case NaN:
                        downloadStatsObj[key] = {
                            "download_count": 'NA',
                            "download_url": ''
                        }
                        break;
                    default:
                        var totalDownloadCount = 0;
                        for(var i=0;i<data.length;i++) {
                            totalDownloadCount += data[i].download_count;
                        }

                        downloadStatsObj[key] = {
                            "download_count": totalDownloadCount,
                            "download_url": ''
                        }
                }

                var machingCards = $('.project-card').filter(function(index, card){
                    return $(card).find('.project-name').text() == key
                }).map(function(index, matchedCard){
                    return matchedCard;
                });

                machingCards.each(function(i,ele) {
                    var productCard = this;
                    if(downloadStatsObj[key].download_url) {
                        $(productCard).find('.downloads').html($('<a>').attr('href', downloadStatsObj[key].download_url).attr('target', '_blank').text(downloadStatsObj[key].download_count));
                    } else {
                        $(productCard).find('.downloads').text(downloadStatsObj[key].download_count);
                    }
                    if(machingCards.length === i + 1) {
                        return false;
                    }
                });
            });

        });
    }
    
    function registerEvents() {
        $('.all-projects').off('click').on('click', function() {
            unregisterScroll();
            $('.product-sc-img').hide();
            $('body').css('background', 'white');
            $(".article").removeClass('show');
            $('.main-content-wrapper, .view-all').hide();
            $(".header").css('background', '#009DE6');
            $('.projects-list-container').show();
            $('.page-container').css('top', '5em');
        });

        $('.navbar-toggle').off('click').on('click', function() {
            $("#dOverlay").toggleClass('full-width no-width');
            $('.dView').toggleClass('no-scroll');
        });

        $('#closeBtn, .content-mask').off('click').on('click', function() {
            $("#dOverlay").toggleClass('no-width full-width');
            $('.dView').toggleClass('no-scroll');
        });
        registerScroll();
    }

    function unregisterAllEevents() {
        $('.all-projects').off('click');
        $('.navbar-toggle').off('click');
        $('#closeBtn, .content-mask').off('click');
        unregisterScroll();
    }
    
    function getJsonResponse(requestUrl, callback) {
        $.ajax({
            url: requestUrl,
            dataType: 'jsonp',
            success: function (resp) {
                callback && callback(resp.data);
            }
        });
    }

    function windowScrollHandler(event) {
        var $window = $(window);
        var wVPosition = $window.scrollTop(),
            wHeight = $window.height();

        $('.section').each(function () {
            var $this = $(this);
            var sectionTop = $this.offset().top;

            var visibleSectionHeight = wVPosition + wHeight - sectionTop;
            var isThisInCurrentWindow = visibleSectionHeight < 2 * wHeight,
            nextSectionArriving = visibleSectionHeight > 58,
            shouldUpdateBgColor = nextSectionArriving && isThisInCurrentWindow;
            if (shouldUpdateBgColor) {
                $('body').css('background', $this.data('bgcolor'));
            }
        });
    }

    function registerScroll() {
        $(window).on('scroll', windowScrollHandler);
    }

    function unregisterScroll() {
        $(window).off();
    }

    function showLoader() {
        $('.loader-wrapper').show();
    }

    function hideLoader() {
        $('.loader-wrapper').hide();
    }

    getProjectsData();
})();

module.exports = mainModule;
